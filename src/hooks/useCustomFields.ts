import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type FieldType = 'text' | 'textarea' | 'select' | 'multiselect' | 'date' | 'checkbox' | 'number';

export interface CustomField {
  id: string;
  project_id: string;
  field_name: string;
  field_label: string;
  field_type: FieldType;
  field_options: { options: string[] } | null;
  is_required: boolean;
  display_order: number;
  created_at: string;
  created_by: string;
}

export interface CustomFieldValue {
  id: string;
  content_id: string;
  field_id: string;
  value: unknown;
  created_at: string;
  updated_at: string;
}

export function useCustomFields(projectId: string | null) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFields = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('content_custom_fields')
        .select('*')
        .eq('project_id', projectId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setFields((data as CustomField[]) || []);
    } catch (error) {
      console.error('Error fetching custom fields:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const addField = useCallback(async (field: {
    field_name: string;
    field_label: string;
    field_type: FieldType;
    field_options?: { options: string[] } | null;
    is_required?: boolean;
  }) => {
    if (!projectId) return null;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const maxOrder = fields.length > 0 
        ? Math.max(...fields.map(f => f.display_order)) 
        : -1;

      const { data, error } = await supabase
        .from('content_custom_fields')
        .insert({
          project_id: projectId,
          field_name: field.field_name,
          field_label: field.field_label,
          field_type: field.field_type,
          field_options: field.field_options || null,
          is_required: field.is_required || false,
          display_order: maxOrder + 1,
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      setFields(prev => [...prev, data as CustomField]);
      toast.success('Campo personalizado agregado');
      return data;
    } catch (error: unknown) {
      console.error('Error adding custom field:', error);
      toast.error('Error al agregar campo personalizado');
      return null;
    }
  }, [projectId, fields]);

  const updateField = useCallback(async (fieldId: string, updates: Partial<CustomField>) => {
    try {
      const { error } = await supabase
        .from('content_custom_fields')
        .update(updates)
        .eq('id', fieldId);

      if (error) throw error;

      setFields(prev => prev.map(f => 
        f.id === fieldId ? { ...f, ...updates } : f
      ));
      toast.success('Campo actualizado');
    } catch (error) {
      console.error('Error updating custom field:', error);
      toast.error('Error al actualizar campo');
    }
  }, []);

  const deleteField = useCallback(async (fieldId: string) => {
    try {
      const { error } = await supabase
        .from('content_custom_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;

      setFields(prev => prev.filter(f => f.id !== fieldId));
      toast.success('Campo eliminado');
    } catch (error) {
      console.error('Error deleting custom field:', error);
      toast.error('Error al eliminar campo');
    }
  }, []);

  return {
    fields,
    loading,
    addField,
    updateField,
    deleteField,
    refetch: fetchFields,
  };
}

export function useCustomFieldValues(contentId: string | null) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);

  const fetchValues = useCallback(async () => {
    if (!contentId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('content_custom_values')
        .select('*')
        .eq('content_id', contentId);

      if (error) throw error;

      const valuesMap: Record<string, unknown> = {};
      (data || []).forEach((v: CustomFieldValue) => {
        valuesMap[v.field_id] = v.value;
      });
      setValues(valuesMap);
    } catch (error) {
      console.error('Error fetching custom field values:', error);
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    fetchValues();
  }, [fetchValues]);

  const saveValues = useCallback(async (
    contentId: string,
    fieldValues: Record<string, unknown>
  ) => {
    try {
      const upserts = Object.entries(fieldValues).map(([fieldId, value]) => ({
        content_id: contentId,
        field_id: fieldId,
        value: value as string,
        updated_at: new Date().toISOString(),
      }));

      for (const upsert of upserts) {
        const { error } = await supabase
          .from('content_custom_values')
          .upsert(upsert, { onConflict: 'content_id,field_id' });

        if (error) throw error;
      }

      setValues(fieldValues);
    } catch (error) {
      console.error('Error saving custom field values:', error);
      toast.error('Error al guardar valores personalizados');
    }
  }, []);

  return {
    values,
    loading,
    saveValues,
    refetch: fetchValues,
  };
}
