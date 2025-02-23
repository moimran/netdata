import { useState, useEffect } from 'react'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import { createItem, updateItem } from '../services/api'

function IPAMModal({ show, onHide, item, tableName, schema }) {
  const [formData, setFormData] = useState({})
  const [error, setError] = useState(null)

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
    const type = column.type.toLowerCase()
    if (type.includes('int')) return 'number'
    if (type.includes('bool')) return 'checkbox'
    if (type.includes('timestamp')) return 'datetime-local'
    if (column.name.includes('email')) return 'email'
    if (column.name.includes('password')) return 'password'
    if (column.name === 'status') return 'select'
    return 'text'
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
                {fieldType === 'select' ? (
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
