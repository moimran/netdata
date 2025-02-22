import { useState, useEffect } from 'react'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import { fetchData } from '../services/api'

function IPAMModal({ show, item, tableName, mode, onClose, onSave }) {
  const [formData, setFormData] = useState({})
  const [relatedData, setRelatedData] = useState({})

  useEffect(() => {
    if (mode === 'add') {
      const defaults = getDefaultValues(tableName)
      setFormData(defaults)
    } else {
      setFormData(item || {})
    }
    loadRelatedData()
  }, [show, item, mode, tableName])

  const loadRelatedData = async () => {
    try {
      const data = await fetchData()
      setRelatedData(data)
    } catch (error) {
      console.error('Error loading related data:', error)
    }
  }

  const getDefaultValues = (table) => {
    switch (table) {
      case 'regions':
        return { 
          name: '',
          slug: '',
          parent_id: '',
          description: ''
        }
      case 'site_groups':
        return { 
          name: '',
          slug: '',
          parent_id: '',
          description: ''
        }
      case 'sites':
        return { 
          name: '',
          slug: '',
          status: 'active',
          region_id: '',
          site_group_id: '',
          facility: '',
          physical_address: '',
          shipping_address: '',
          latitude: '',
          longitude: '',
          contact_name: '',
          contact_phone: '',
          contact_email: '',
          comments: ''
        }
      case 'locations':
        return { 
          name: '',
          slug: '',
          site_id: '',
          parent_id: '',
          status: 'active',
          tenant_id: '',
          description: ''
        }
      case 'vrfs':
        return { 
          name: '',
          rd: '',
          enforce_unique: true,
          description: ''
        }
      case 'rirs':
        return { 
          name: '',
          slug: '',
          description: ''
        }
      case 'aggregates':
        return { 
          prefix: '',
          rir_id: '',
          description: ''
        }
      case 'roles':
        return { 
          name: '',
          slug: '',
          description: ''
        }
      case 'prefixes':
        return { 
          prefix: '',
          vrf_id: '',
          aggregate_id: '',
          role_id: '',
          site_id: '',
          status: 'active',
          description: ''
        }
      case 'ip_ranges':
        return { 
          start_address: '',
          end_address: '',
          prefix_id: '',
          vrf_id: '',
          status: 'active',
          description: ''
        }
      case 'ip_addresses':
        return { 
          address: '',
          vrf_id: '',
          prefix_id: '',
          status: 'active',
          description: ''
        }
      default:
        return {}
    }
  }

  const formatFieldName = (name) => {
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData({
      ...formData,
      [e.target.name]: value
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  const getFormFields = () => {
    if (mode === 'add') {
      return Object.keys(getDefaultValues(tableName))
    }
    return Object.keys(item || {}).filter(key => 
      !key.startsWith('_') && 
      key !== 'id' && 
      key !== 'created_at'
    )
  }

  const getFieldType = (fieldName) => {
    if (fieldName === 'enforce_unique') return 'checkbox'
    if (fieldName === 'description' || fieldName === 'comments' || 
        fieldName === 'physical_address' || fieldName === 'shipping_address') return 'textarea'
    if (fieldName === 'status') return 'select'
    if (fieldName === 'contact_email') return 'email'
    if (fieldName === 'contact_phone') return 'tel'
    if (fieldName.includes('_id')) return 'relation'
    if (fieldName === 'latitude' || fieldName === 'longitude') return 'number'
    return 'text'
  }

  const getStatusOptions = () => {
    switch (tableName) {
      case 'sites':
      case 'locations':
        return ['active', 'planned', 'staging', 'decommissioning', 'retired']
      case 'prefixes':
      case 'ip_ranges':
      case 'ip_addresses':
        return ['active', 'reserved', 'deprecated']
      default:
        return ['active', 'inactive']
    }
  }

  const getRelationOptions = (fieldName) => {
    // Convert field name to table name (e.g., region_id -> regions)
    const getTableName = (field) => {
      const base = field.replace('_id', '')
      return base === 'parent' ? tableName : base + 's'
    }

    const table = getTableName(fieldName)
    const items = relatedData[table] || []

    // For parent relationships, filter out the current item and its descendants
    if (fieldName === 'parent_id' && item?.id) {
      return items.filter(i => i.id !== item.id)
    }

    return items
  }

  const getRelationLabel = (fieldName) => {
    if (fieldName === 'parent_id') {
      return `Parent ${formatFieldName(tableName.slice(0, -1))}`
    }
    return formatFieldName(fieldName.replace('_id', ''))
  }

  const isFieldRequired = (field) => {
    const optionalFields = [
      'description', 'comments', 'parent_id', 'region_id', 'site_group_id',
      'facility', 'physical_address', 'shipping_address', 'latitude', 'longitude',
      'contact_name', 'contact_phone', 'contact_email', 'tenant_id',
      'vrf_id', 'aggregate_id', 'role_id'
    ]
    return !optionalFields.includes(field)
  }

  const getTableIcon = (tableName) => {
    switch (tableName) {
      case 'regions':
        return 'fa-map'
      case 'site_groups':
        return 'fa-sitemap'
      case 'sites':
        return 'fa-building'
      case 'locations':
        return 'fa-map-pin'
      case 'vrfs':
        return 'fa-network-wired'
      case 'rirs':
        return 'fa-globe'
      case 'aggregates':
        return 'fa-cubes'
      case 'roles':
        return 'fa-user-tag'
      case 'prefixes':
        return 'fa-code-branch'
      case 'ip_ranges':
        return 'fa-chart-line'
      case 'ip_addresses':
        return 'fa-laptop'
      default:
        return 'fa-question-circle'
    }
  }

  return (
    <Modal show={show} onHide={onClose} centered size="lg" className="modal-adminlte">
      <Modal.Header closeButton className="bg-light">
        <Modal.Title>
          <i className={`fas ${getTableIcon(tableName)} mr-2`}></i>
          {mode === 'add' ? 'Add New' : 'Edit'} {formatFieldName(tableName.slice(0, -1))}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body className="bg-white">
          <div className="row">
            {getFormFields().map(field => (
              <div className={`${field === 'description' || field === 'comments' ? 'col-12' : 'col-md-6'} mb-3`} key={field}>
                <div className="form-group">
                  <label className="text-sm">
                    {getFieldType(field) === 'relation' ? getRelationLabel(field) : formatFieldName(field)}
                    {isFieldRequired(field) && <span className="text-danger">*</span>}
                  </label>
                  {getFieldType(field) === 'textarea' ? (
                    <Form.Control
                      as="textarea"
                      name={field}
                      value={formData[field] || ''}
                      onChange={handleChange}
                      rows={3}
                      required={isFieldRequired(field)}
                      className="form-control-border"
                    />
                  ) : getFieldType(field) === 'checkbox' ? (
                    <div className="custom-control custom-checkbox">
                      <Form.Check
                        type="checkbox"
                        id={field}
                        name={field}
                        checked={formData[field] || false}
                        onChange={handleChange}
                        label={formatFieldName(field)}
                        className="custom-control-input"
                      />
                    </div>
                  ) : getFieldType(field) === 'select' ? (
                    <Form.Select
                      name={field}
                      value={formData[field] || ''}
                      onChange={handleChange}
                      required={isFieldRequired(field)}
                      className="form-control form-control-border"
                    >
                      <option value="">Select {formatFieldName(field)}</option>
                      {getStatusOptions().map(option => (
                        <option key={option} value={option}>
                          {formatFieldName(option)}
                        </option>
                      ))}
                    </Form.Select>
                  ) : getFieldType(field) === 'relation' ? (
                    <Form.Select
                      name={field}
                      value={formData[field] || ''}
                      onChange={handleChange}
                      required={isFieldRequired(field)}
                      className="form-control form-control-border"
                    >
                      <option value="">Select {getRelationLabel(field)}</option>
                      {getRelationOptions(field).map(option => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </Form.Select>
                  ) : (
                    <Form.Control
                      type={getFieldType(field)}
                      name={field}
                      value={formData[field] || ''}
                      onChange={handleChange}
                      required={isFieldRequired(field)}
                      placeholder={`Enter ${formatFieldName(field)}`}
                      step={getFieldType(field) === 'number' ? 'any' : undefined}
                      className="form-control form-control-border"
                    />
                  )}
                  {field === 'slug' && (
                    <small className="form-text text-muted">
                      URL-friendly unique identifier. Leave blank to auto-generate from name.
                    </small>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="default" onClick={onClose}>
            <i className="fas fa-times mr-1"></i> Cancel
          </Button>
          <Button variant="primary" type="submit">
            <i className={`fas ${mode === 'add' ? 'fa-plus' : 'fa-save'} mr-1`}></i>
            {mode === 'add' ? 'Create' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

export default IPAMModal
