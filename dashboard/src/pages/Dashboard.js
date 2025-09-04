import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { 
  TrendingUp, 
  Tree, 
  CreditCard, 
  Users, 
  MapPin,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { useQuery } from 'react-query';
import { fetchProjects, fetchCarbonCredits } from '../services/api';

const Dashboard = () => {
  const [viewState, setViewState] = useState({
    longitude: 78.9629, // India center
    latitude: 20.5937,
    zoom: 5
  });
  const [selectedProject, setSelectedProject] = useState(null);

  // Fetch data
  const { data: projects = [] } = useQuery('projects', fetchProjects);
  const { data: carbonCredits = [] } = useQuery('carbonCredits', fetchCarbonCredits);

  // Calculate metrics
  const totalProjects = projects.length;
  const verifiedProjects = projects.filter(p => p.isVerified).length;
  const totalCarbonCredits = carbonCredits.reduce((sum, credit) => sum + credit.amount, 0);
  const totalArea = projects.reduce((sum, project) => sum + project.totalArea, 0);

  const metrics = [
    {
      name: 'Total Projects',
      value: totalProjects,
      icon: Tree,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Verified Projects',
      value: verifiedProjects,
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'Carbon Credits',
      value: totalCarbonCredits.toLocaleString(),
      icon: CreditCard,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      name: 'Total Area (ha)',
      value: (totalArea / 10000).toFixed(1),
      icon: MapPin,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor blue carbon projects and carbon credit generation
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.name}
            className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6"
          >
            <dt>
              <div className={`absolute rounded-md p-3 ${metric.bgColor}`}>
                <metric.icon className={`h-6 w-6 ${metric.color}`} />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">
                {metric.name}
              </p>
            </dt>
            <dd className="ml-16 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">{metric.value}</p>
            </dd>
          </div>
        ))}
      </div>

      {/* Map and Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Map */}
        <div className="rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Project Locations</h3>
            <div className="h-96 rounded-lg overflow-hidden">
              <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  />
  {projects.map((project) => (
    <Marker
      key={project.id}
      position={[project.latitude, project.longitude]}
    >
      <Popup>
        <div className="p-2">
          <h3 className="font-semibold text-sm">{project.name}</h3>
          <p className="text-xs text-gray-600">{project.location}</p>
          {/* ... other details ... */}
        </div>
      </Popup>
    </Marker>
  ))}
</MapContainer>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="flow-root">
              <ul className="-mb-8">
                {projects.slice(0, 5).map((project, projectIdx) => (
                  <li key={project.id}>
                    <div className="relative pb-8">
                      {projectIdx !== projects.length - 1 ? (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                            project.isVerified ? 'bg-green-500' : 'bg-yellow-500'
                          }`}>
                            {project.isVerified ? (
                              <CheckCircle className="h-5 w-5 text-white" />
                            ) : (
                              <Tree className="h-5 w-5 text-white" />
                            )}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm text-gray-500">
                              Project <span className="font-medium text-gray-900">{project.name}</span> was{' '}
                              {project.isVerified ? 'verified' : 'created'}
                            </p>
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-gray-500">
                            <time dateTime={project.createdAt}>
                              {new Date(project.createdAt).toLocaleDateString()}
                            </time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Project Status Chart */}
      <div className="rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Project Status Overview</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">Verified</p>
                  <p className="text-2xl font-bold text-green-900">{verifiedProjects}</p>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center">
                <Tree className="h-8 w-8 text-yellow-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-yellow-800">Pending</p>
                  <p className="text-2xl font-bold text-yellow-900">{totalProjects - verifiedProjects}</p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-800">Success Rate</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {totalProjects > 0 ? Math.round((verifiedProjects / totalProjects) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
