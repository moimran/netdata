import { useState, useEffect } from 'react'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import IPAMModal from './IPAMModal'
import { fetchData, createItem, updateItem, deleteItem } from '../services/api'

function IPAMTable() {
  const [tables, setTables] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [currentItem, setCurrentItem] = useState(null)
  const [currentTable, setCurrentTable] = useState('')
  const [modalMode, setModalMode] = useState('add')
  const [expandedTable, setExpandedTable] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchData()
      setTables(data)
    }
    loadData()
  }, [])

  const formatTableName = (name) => {
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const getColumns = (item) => {
    if (!item) return []
    return Object.keys(item).filter(key => !key.startsWith('_') && key !== 'created_at')
  }

  const handleEdit = (tableName, item) => {
    setCurrentItem(item)
    setCurrentTable(tableName)
    setModalMode('edit')
    setShowModal(true)
  }

  const handleAdd = (tableName) => {
    setCurrentItem(null)
    setCurrentTable(tableName)
    setModalMode('add')
    setShowModal(true)
  }

  const handleDelete = async (tableName, id) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    
    try {
      await deleteItem(tableName, id)
      const newData = await fetchData()
      setTables(newData)
    } catch (error) {
      console.error('Error:', error)
      alert('Error deleting item')
    }
  }

  const handleSave = async (item) => {
    try {
      if (modalMode === 'edit') {
        await updateItem(currentTable, item.id, item)
      } else {
        await createItem(currentTable, item)
      }
      const newData = await fetchData()
      setTables(newData)
      setShowModal(false)
    } catch (error) {
      console.error('Error:', error)
      alert('Error saving item')
    }
  }

  const getTableIcon = (tableName) => {
    const icons = {
      regions: 'fa-globe',
      site_groups: 'fa-folder-tree',
      sites: 'fa-building',
      locations: 'fa-map-marker-alt',
      vrfs: 'fa-network-wired',
      rirs: 'fa-cloud',
      aggregates: 'fa-project-diagram',
      roles: 'fa-tags',
      prefixes: 'fa-sitemap',
      ip_ranges: 'fa-bars',
      ip_addresses: 'fa-laptop'
    }
    return icons[tableName] || 'fa-table'
  }

  const getStatusBadgeClass = (status) => {
    const classes = {
      active: 'success',
      planned: 'info',
      staging: 'warning',
      decommissioning: 'danger',
      retired: 'secondary',
      reserved: 'primary',
      deprecated: 'dark'
    }
    return `badge badge-${classes[status] || 'secondary'}`
  }

  return (
    <div className="wrapper">
      {/* Main Sidebar */}
      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        {/* Brand Logo */}
        <a href="#" className="brand-link">
          <i className="fas fa-network-wired brand-image"></i>
          <span className="brand-text font-weight-light">IPAM Dashboard</span>
        </a>

        {/* Sidebar */}
        <div className="sidebar">
          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu">
              {Object.keys(tables).map((tableName) => (
                <li className="nav-item" key={tableName}>
                  <a 
                    href="#" 
                    className={`nav-link ${expandedTable === tableName ? 'active' : ''}`}
                    onClick={() => setExpandedTable(tableName)}
                  >
                    <i className={`nav-icon fas ${getTableIcon(tableName)}`}></i>
                    <p>{formatTableName(tableName)}</p>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Content Wrapper */}
      <div className="content-wrapper">
        {/* Content Header */}
        {expandedTable && (
          <div className="content-header">
            <div className="container-fluid">
              <div className="row">
                <div className="col-sm-6">
                  <h1 className="m-0">{formatTableName(expandedTable)}</h1>
                </div>
                <div className="col-sm-6">
                  <Button 
                    className="float-right"
                    variant="primary"
                    onClick={() => handleAdd(expandedTable)}
                  >
                    <i className="fas fa-plus"></i> Add New
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                          {tables[expandedTable]?.[0] && getColumns(tables[expandedTable][0]).map(column => (
                            <th key={column}>{formatTableName(column)}</th>
                          ))}
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tables[expandedTable]?.map(item => (
                          <tr key={item.id}>
                            {getColumns(item).map(column => (
                              <td key={column}>
                                {column === 'status' ? (
                                  <span className={getStatusBadgeClass(item[column])}>
                                    {formatTableName(item[column])}
                                  </span>
                                ) : (
                                  item[column]?.toString()
                                )}
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
                            <td colSpan={getColumns(tables[expandedTable]?.[0]).length + 1} className="text-center">
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

      <IPAMModal
        show={showModal}
        item={currentItem}
        tableName={currentTable}
        mode={modalMode}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
      />
    </div>
  )
}

export default IPAMTable
