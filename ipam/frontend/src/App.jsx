import IPAMTable from './components/IPAMTable'
import Sidebar from './components/Sidebar'
import './App.css'

function App() {
  return (
    <div className="wrapper">
      <Sidebar />
      <div className="content-wrapper">
        <div className="content-header">
          <div className="container-fluid">
            <h1 className="m-0">IPAM Dashboard</h1>
          </div>
        </div>
        <div className="content">
          <div className="container-fluid">
            <IPAMTable />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
