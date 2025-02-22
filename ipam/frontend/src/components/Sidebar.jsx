function Sidebar() {
  return (
    <aside className="main-sidebar sidebar-dark-primary elevation-4">
      <a href="/" className="brand-link">
        <span className="brand-text font-weight-light">IPAM Dashboard</span>
      </a>

      <div className="sidebar">
        <nav className="mt-2">
          <ul className="nav nav-pills nav-sidebar flex-column">
            <li className="nav-item">
              <a href="#" className="nav-link">
                <i className="nav-icon fas fa-network-wired"></i>
                <p>VRFs</p>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" className="nav-link">
                <i className="nav-icon fas fa-sitemap"></i>
                <p>Prefixes</p>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" className="nav-link">
                <i className="nav-icon fas fa-map-marker-alt"></i>
                <p>IP Ranges</p>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" className="nav-link">
                <i className="nav-icon fas fa-desktop"></i>
                <p>IP Addresses</p>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  )
}

export default Sidebar
