import React, { useState } from 'react';
import {
  Cpu,
  HardDrive,
  Thermometer,
  BarChart3,
  Clock,
  Power,
  Activity,
  ArrowUpRight,
  Trash2,
  Edit2,
  RefreshCw,
} from 'lucide-react';

const Stations = ({ readOnly = false }) => {
  const [query] = useState('');

  const controllers = [
    {
      id: 1,
      name: 'Controller 1',
      status: 'online',
      lastUpdated: '2 mins ago',
      metrics: [
        { icon: <Cpu size={18} />, label: 'CPU Usage', value: '28%' },
        { icon: <HardDrive size={18} />, label: 'Storage Usage', value: '20 GB of 100GB' },
        { icon: <Thermometer size={18} />, label: 'CPU Temperature', value: '60°C' },
        { icon: <BarChart3 size={18} />, label: 'RAM Usage', value: '28%' },
        { icon: <Clock size={18} />, label: 'System Uptime', value: '3d 12h' },
        { icon: <Power size={18} />, label: 'Voltage / Power Status', value: 'Normal' },
      ],
    },
    {
      id: 2,
      name: 'Controller 2',
      status: 'online',
      lastUpdated: '5 mins ago',
      metrics: [
        { icon: <Cpu size={18} />, label: 'CPU Usage', value: '28%' },
        { icon: <Thermometer size={18} />, label: 'CPU Temperature', value: '60°C' },
        { icon: <BarChart3 size={18} />, label: 'RAM Usage', value: '28%' },
        { icon: <Activity size={18} />, label: 'GPU Load', value: '28%' },
        { icon: <HardDrive size={18} />, label: 'Storage Usage', value: '20 GB of 100GB' },
        { icon: <Clock size={18} />, label: 'System Uptime', value: '3d 12h' },
        { icon: <Power size={18} />, label: 'Voltage / Power Status', value: 'Normal' },
      ],
    },
  ];

  const stations = [
    { id: 'S001', name: 'Station Alpha', status: 'active', controller: 'Controller 1' },
    { id: 'S002', name: 'Station Beta', status: 'active', controller: 'Controller 1' },
    { id: 'S003', name: 'Station Gamma', status: 'maintenance', controller: 'Controller 1' },
    { id: 'S004', name: 'Station Delta', status: 'active', controller: 'Controller 1' },
    { id: 'S005', name: 'Station Epsilon', status: 'active', controller: 'Controller 2' },
    { id: 'S006', name: 'Station Zeta', status: 'active', controller: 'Controller 2' },
    { id: 'S007', name: 'Station Eta', status: 'offline', controller: 'Controller 2' },
    { id: 'S008', name: 'Station Theta', status: 'active', controller: 'Controller 2' },
    { id: 'S009', name: 'Station Iota', status: 'active', controller: 'Controller 2' },
    { id: 'S010', name: 'Station Kappa', status: 'active', controller: 'Controller 2' },
  ];

  const filteredStations = stations.filter((s) => (`${s.name} ${s.id}`).toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900"></h1>

           {!readOnly && (
             <button className="px-3 py-2 border rounded bg-[#CB30E0] text-white text-sm">
                <span className="text-sm">Add New Controller</span>
              </button>
           )}
      </div>

      {/* Controllers */}
      <div className="space-y-6">
        {controllers.map((ctl) => (
          <div key={ctl.id} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div>
                <h2 className="text-lg font-medium text-gray-900">{ctl.name}</h2>
              </div>
              {!readOnly && (
                <div className="flex items-center">
                  <button aria-label="Delete" className="p-2 text-red-600 ">
                    <Trash2 size={16} />
                  </button>
                  <button aria-label="Edit" className="p-2 text-gray-600 ">
                    <Edit2 size={16} />
                  </button>
                  <button aria-label="Refresh" className="p-2 text-gray-600 ">
                    <RefreshCw size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* First row with 4 boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {ctl.metrics.slice(0, 4).map((m, i) => (
                <div key={i} className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm relative">
                  <div className="absolute top-3 right-3">
                    <div className="inline-flex items-center gap-2 bg-white border border-gray-100 rounded-md px-2 py-1 text-xs text-green-600">
                      <ArrowUpRight size={14} className="text-green-500" />
                      <span className="font-medium">2.8%</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-gray-50">{m.icon}</div>
                      <div>
                        <div className="text-xs font-medium text-gray-500">{m.label}</div>
                        <div className="text-xl font-semibold text-gray-900 mt-1">{m.value}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Second row with 3 boxes (Controller 1) or 3 boxes (Controller 2) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ctl.metrics.slice(4).map((m, i) => (
                <div key={i} className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm relative">
                  <div className="absolute top-3 right-3">
                    <div className="inline-flex items-center gap-2 bg-white border border-gray-100 rounded-md px-2 py-1 text-xs text-green-600">
                      <ArrowUpRight size={14} className="text-green-500" />
                      <span className="font-medium">2.8%</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-gray-50">{m.icon}</div>
                      <div>
                        <div className="text-xs font-medium text-gray-500">{m.label}</div>
                        <div className="text-xl font-semibold text-gray-900 mt-1">{m.value}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Stations;