import { useState, useEffect } from 'react'
import IPAMModal from './IPAMModal'
import { fetchData, fetchTableSchema, deleteItem } from '../services/api'

function IPAMTable() {
  const [tables, setTables] = useState({})
  const [expandedTable, setExpandedTable] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [schemas, setSchemas] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (expandedTable) {
      loadTableSchema(expandedTable)
    }
  }, [expandedTable])

  const loadData = async () => {
    try {
      const data = await fetchData()
      setTables(data)
    } catch (error) {
      setError('Failed to load data')
      console.error('Error loading data:', error)
    }
  }

  const loadTableSchema = async (tableName) => {
    try {
      if (!schemas[tableName]) {
        const schema = await fetchTableSchema(tableName)
        setSchemas(prev => ({ ...prev, [tableName]: schema }))
      }
    } catch (error) {
      setError('Failed to load schema')
      console.error('Error loading schema:', error)
    }
  }

  const formatTableName = (name) => {
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const getColumns = (tableName) => {
    if (!schemas[tableName]) return []
    return schemas[tableName].columns
      .filter(col => !col.name.startsWith('_') && col.name !== 'created_at')
      .map(col => col.name)
  }

  const handleEdit = (tableName, item) => {
    setSelectedItem(item)
    setShowModal(true)
  }

  const handleDelete = async (tableName, id) => {
    try {
      await deleteItem(tableName, id)
      loadData()
    } catch (error) {
      setError('Failed to delete item')
      console.error('Error deleting item:', error)
    }
  }

  const handleModalClose = () => {
    setSelectedItem(null)
    setShowModal(false)
    loadData()
  }

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'badge bg-success'
      case 'reserved':
        return 'badge bg-warning'
      case 'deprecated':
        return 'badge bg-danger'
      case 'available':
        return 'badge bg-info'
      default:
        return 'badge bg-secondary'
    }
  }

  const formatValue = (value, column) => {
    if (!value) return ''
    if (column === 'status') {
      return (
        <span className={getStatusBadgeClass(value)}>
          {formatTableName(value)}
        </span>
      )
    }
    if (value instanceof Date || (typeof value === 'string' && value.includes('T'))) {
      const date = new Date(value)
      return date.toLocaleString()
    }
    return value.toString()
  }

  return (
    <div className="wrapper">
      {/* Sidebar */}
      <aside className="main-sidebar sidebar-dark-primary">
        <a href="#" className="brand-link">
          <span className="brand-text font-weight-light">IPAM Dashboard</span>
        </a>
        <div className="sidebar">
          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column">
              {Object.keys(tables).map(tableName => (
                <li className="nav-item" key={tableName}>
                  <a
                    href="#"
                    className={`nav-link ${expandedTable === tableName ? 'active' : ''}`}
                    onClick={() => setExpandedTable(tableName)}
                  >
                    <i className="nav-icon fas fa-table"></i>
                    <p>{formatTableName(tableName)}</p>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Content */}
      <div className="content-wrapper">
        {/* Content Header */}
        <div className="content-header">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0">
                  {expandedTable ? formatTableName(expandedTable) : 'Select a table'}
                </h1>
              </div>
              <div className="col-sm-6">
                <button
                  className="btn btn-primary float-right"
                  onClick={() => setShowModal(true)}
                  disabled={!expandedTable}
                >
                  <i className="fas fa-plus"></i> Add New
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <section className="content">
          <div className="container-fluid">
            {expandedTable && (
              <div className="card">
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover text-nowrap">
                      <thead>
                        <tr>
                          {getColumns(expandedTable).map(column => (
                            <th key={column}>{formatTableName(column)}</th>
                          ))}
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tables[expandedTable]?.map(item => (
                          <tr key={item.id}>
                            {getColumns(expandedTable).map(column => (
                              <td key={column}>
                                {formatValue(item[column], column)}
                              </td>
                            ))}
                            <td>
                              <div className="btn-group">
                                <button
                                  type="button"
                                  className="btn btn-default btn-sm"
                                  onClick={() => handleEdit(expandedTable, item)}
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleDelete(expandedTable, item.id)}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {(!tables[expandedTable] || tables[expandedTable].length === 0) && (
                          <tr>
                            <td colSpan={getColumns(expandedTable).length + 1} className="text-center">
                              No data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modal */}
      {showModal && (
        <IPAMModal
          show={showModal}
          onHide={handleModalClose}
          item={selectedItem}
          tableName={expandedTable}
          schema={schemas[expandedTable]}
        />
      )}
    </div>
  )
}

export default IPAMTable
