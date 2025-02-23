import { useState, useEffect } from 'react'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import { createItem, updateItem, fetchReferenceOptions } from '../services/api'

function IPAMModal({ show, onHide, item, tableName, schema }) {
  const [formData, setFormData] = useState({})
  const [error, setError] = useState(null)
  const [referenceOptions, setReferenceOptions] = useState({})

  useEffect(() => {
    if (item) {
      setFormData(item)
    } else {
      const defaultValues = {}
      schema?.columns.forEach(col => {
        if (!col.name.startsWith('_') && col.name !== 'created_at') {
          defaultValues[col.name] = col.default || ''
        }
      })
      setFormData(defaultValues)
    }
  }, [item, schema])

  useEffect(() => {
    // Load reference options for foreign key fields
    const loadReferenceOptions = async () => {
      const options = {}
      for (const column of schema?.columns || []) {
        if (column.is_foreign_key) {
          try {
            const data = await fetchReferenceOptions(tableName, column.name)
            options[column.name] = data
          } catch (error) {
            console.error(`Error loading reference options for ${column.name}:`, error)
          }
        }
      }
      setReferenceOptions(options)
    }

    if (schema) {
      loadReferenceOptions()
    }
  }, [schema, tableName])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (item) {
        await updateItem(tableName, item.id, formData)
      } else {
        await createItem(tableName, formData)
      }
      onHide()
    } catch (error) {
      setError('Failed to save item')
      console.error('Error saving item:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const formatFieldName = (name) => {
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const getFieldType = (column) => {
    if (column.is_foreign_key) return 'reference'
    if (column.input_type === 'datetime-local') return 'datetime-local'
    if (column.input_type === 'number') return 'number'
    if (column.name === 'status') return 'select'
    return column.input_type || 'text'
  }

  const getStatusOptions = () => {
    return ['active', 'reserved', 'deprecated', 'available']
  }

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {item ? 'Edit' : 'Add'} {formatFieldName(tableName)}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          {schema?.columns.map(column => {
            if (column.name.startsWith('_') || column.name === 'created_at' || column.name === 'id') {
              return null
            }

            const fieldType = getFieldType(column)
            return (
              <Form.Group key={column.name} className="mb-3">
                <Form.Label>{formatFieldName(column.name)}</Form.Label>
                {fieldType === 'reference' ? (
                  <Form.Select
                    name={column.name}
                    value={formData[column.name] || ''}
                    onChange={handleInputChange}
                    required={!column.nullable}
                  >
                    <option value="">Select {formatFieldName(column.name.replace('_id', ''))}</option>
                    {referenceOptions[column.name]?.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.name || option.slug || option.id}
                      </option>
                    ))}
                  </Form.Select>
                ) : fieldType === 'select' ? (
                  <Form.Select
                    name={column.name}
                    value={formData[column.name] || ''}
                    onChange={handleInputChange}
                    required={!column.nullable}
                  >
                    <option value="">Select {formatFieldName(column.name)}</option>
                    {getStatusOptions().map(option => (
                      <option key={option} value={option}>
                        {formatFieldName(option)}
                      </option>
                    ))}
                  </Form.Select>
                ) : (
                  <Form.Control
                    type={fieldType}
                    name={column.name}
                    value={formData[column.name] || ''}
                    onChange={handleInputChange}
                    required={!column.nullable}
                    placeholder={`Enter ${formatFieldName(column.name)}`}
                  />
                )}
                {column.description && (
                  <Form.Text className="text-muted">
                    {column.description}
                  </Form.Text>
                )}
              </Form.Group>
            )
          })}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            {item ? 'Update' : 'Create'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

export default IPAMModal
