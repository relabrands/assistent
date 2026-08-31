import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';
import { auth, db } from '@/integrations/firebase/client';
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

  useEffect(() => {
    if (!projectId) {
      setFields([]);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'content_custom_fields'),
      where('project_id', '==', projectId)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomField));
      items.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      setFields(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching custom fields from Firestore:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId]);

  const addField = useCallback(async (field: {
    field_name: string;
    field_label: string;
    field_type: FieldType;
    field_options?: { options: string[] } | null;
    is_required?: boolean;
  }) => {
    if (!projectId) return null;

    try {
      const user = auth.currentUser;
      const maxOrder = fields.length > 0 
        ? Math.max(...fields.map(f => f.display_order)) 
        : -1;

      const newField = {
        project_id: projectId,
        field_name: field.field_name,
        field_label: field.field_label,
        field_type: field.field_type,
        field_options: field.field_options || null,
        is_required: field.is_required || false,
        display_order: maxOrder + 1,
        created_by: user?.uid || 'user',
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'content_custom_fields'), newField);
      toast.success('Campo personalizado agregado');
      return { id: docRef.id, ...newField } as CustomField;
    } catch (error: unknown) {
      console.error('Error adding custom field:', error);
      toast.error('Error al agregar campo personalizado');
      return null;
    }
  }, [projectId, fields]);

  const updateField = useCallback(async (fieldId: string, updates: Partial<CustomField>) => {
    try {
      await updateDoc(doc(db, 'content_custom_fields', fieldId), updates);
      toast.success('Campo actualizado');
    } catch (error) {
      console.error('Error updating custom field:', error);
      toast.error('Error al actualizar campo');
    }
  }, []);

  const deleteField = useCallback(async (fieldId: string) => {
    try {
      await deleteDoc(doc(db, 'content_custom_fields', fieldId));
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
    refetch: () => {},
  };
}

export function useCustomFieldValues(contentId: string | null) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contentId) {
      setValues({});
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'content_custom_values'),
      where('content_id', '==', contentId)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const valuesMap: Record<string, unknown> = {};
      snap.docs.forEach((docSnap) => {
        const v = docSnap.data() as CustomFieldValue;
        valuesMap[v.field_id] = v.value;
      });
      setValues(valuesMap);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching custom field values from Firestore:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [contentId]);

  const saveValues = useCallback(async (
    targetContentId: string,
    fieldValues: Record<string, unknown>
  ) => {
    try {
      for (const [fieldId, value] of Object.entries(fieldValues)) {
        const docId = `${targetContentId}_${fieldId}`;
        await setDoc(doc(db, 'content_custom_values', docId), {
          content_id: targetContentId,
          field_id: fieldId,
          value,
          updated_at: new Date().toISOString(),
        });
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
    refetch: () => {},
  };
}
