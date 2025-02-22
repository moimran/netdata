import { useState, useEffect } from 'react'
import IPAMTable from './components/IPAMTable'
import './App.css'

function App() {
  return (
    <div className="app">
      <div className="container mt-8">
        <IPAMTable />
      </div>
    </div>
  )
}

export default App
