import { useState, useCallback } from 'react';

export interface ValidationErrors {
  [key: string]: string;
}

export interface UseFormStateOptions<T> {
  initialValues: T;
  validate?: (values: T) => ValidationErrors;
  onSubmit?: (values: T) => Promise<void> | void;
}

/**
 * Hook for managing form state, validation, and submission
 *
 * @param options Form options including initial values and validation function
 * @returns Form state and handlers
 */
export function useFormState<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit
}: UseFormStateOptions<T>) {
  const [formData, setFormData] = useState<T>(initialValues);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  /**
   * Handle input change for form fields
   */
  const handleChange = useCallback((name: keyof T, value: any) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when it changes
    if (validationErrors[name as string]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as string];
        return newErrors;
      });
    }
  }, [validationErrors]);
  
  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setFormData(initialValues);
    setValidationErrors({});
    setIsSubmitting(false);
  }, [initialValues]);
  
  /**
   * Validate form data
   */
  const validateForm = useCallback(() => {
    if (!validate) return {};
    
    const errors = validate(formData);
    setValidationErrors(errors);
    return errors;
  }, [formData, validate]);
  
  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      return false;
    }
    
    setIsSubmitting(true);
    
    try {
      if (onSubmit) {
        await onSubmit(formData);
      }
      return true;
    } catch (error) {
      // Handle form submission error
      console.error('Form submission error:', error);
      
      // If error has validation errors, set them
      if (error && typeof error === 'object' && 'validationErrors' in error) {
        setValidationErrors(error.validationErrors as ValidationErrors);
      } else {
        // Generic error
        setValidationErrors({
          general: 'An error occurred while submitting the form'
        });
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSubmit]);
  
  return {
    formData,
    setFormData,
    validationErrors,
    setValidationErrors,
    isSubmitting,
    handleChange,
    resetForm,
    validateForm,
    handleSubmit
  };
} 