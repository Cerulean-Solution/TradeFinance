import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as LucideIcons from 'lucide-react';
interface FrameworkTable {
  name: string;
  count: number;
  icon?: string;
}

interface FrameworkModule {
  id: string;
  title: string;
  description: string;
  color?: string;
  count: number;
  tables: FrameworkTable[];
}

function FrameworkDashboard() {
  const navigate = useNavigate();

  const {
    data: connectionStatus,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['azureConnection'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      console.log('token', token);
      const response = await fetch('/api/framework/test-azure-connection', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Connection failed');
      return response.json() as Promise<{
        connected: boolean;
        message: string;
        totalTables: number;
        connectedTables: number;
        activeConnections: number;
        dataIntegrity: number;
      }>;
    },
    refetchOnWindowFocus: false
  });
  const [frameworkStats, setFrameworkStats] = useState({
    totalTables: 0,
    connectedTables: 0,
    activeConnections: 0,
    dataIntegrity: 0
  });
  useEffect(() => {
    if (connectionStatus) {
      setFrameworkStats({
        totalTables: connectionStatus.totalTables || 0,
        connectedTables: connectionStatus.connectedTables || 0,
        activeConnections: connectionStatus.activeConnections || 0,
        dataIntegrity: connectionStatus.dataIntegrity || 0
      });
    }
  }, [connectionStatus]);
  console.log(connectionStatus);

  const [modules, setModules] = useState<any[]>([]);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const res = await fetch('/api/framework/modules');
        const data = await res.json();
        setModules(data);
      } catch (err) {
        console.error('Error loading modules:', err);
      }
    };

    fetchModules();
  }, []);

  return (
    <>
      <div className="card md:p-10 p-4 pt-6 pb-6">
        {/* card 1 */}
        <div className="">
          <h2 className="md:text-2xl font-bold dark:text-white text-lg">Framework Foundation</h2>
          <p className="md:text-md text-sm text-gray-500 dark:text-gray-600  ">
            Enterprise-grade framework for all software projects with SQL Server integration
          </p>
        </div>
        {/* card 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 md:gap-10 gap-4 w-full p-6 pr-0 pl-0  pb-0">
          <div className="card p-3 md:p-6 flex items-center justify-center gap-3 bg-success text-white">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <i className="ki-solid ki-abstract-26 md:text-5xl text-4xl"></i>
            </div>
            <div className="text-left">
              <h1 className="md:text-2xl text-xl font-bold ">
                {frameworkStats.totalTables} Total Tables
              </h1>
            </div>
          </div>
          <div className="card btn-outline bg-[#BF55EC] text-white p-3 md:p-6 flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <i className="ki-solid ki-data md:text-5xl text-4xl"></i>
            </div>
            <div className="text-left">
              <h1 className="font-bold md:text-2xl text-xl">
                {frameworkStats.connectedTables} Connected Tables
              </h1>
            </div>
          </div>
          <div className="card btn-outline bg-primary text-white p-3 md:p-6 flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <i className="ki-solid ki-arrow-up-refraction  md:text-5xl text-4xl"></i>
            </div>
            <div>
              <h1 className="md:text-2xl text-xl font-bold ">
                {frameworkStats.activeConnections} Active Connections
              </h1>
            </div>
          </div>
          <div className="card btn-outline bg-danger text-white p-3 md:p-6 flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-primary/10 flex items-center justify-center">
              <i className="ki-solid ki-shield md:text-5xl text-4xl"></i>
            </div>
            <div>
              <h1 className="font-bold md:text-2xl text-xl">
                {frameworkStats.dataIntegrity}% Data Integrity
              </h1>

              <div className="progress progress-success w-full h-3 mt-2">
                <div
                  className="progress-bar"
                  role="progressbar"
                  style={{ width: `${frameworkStats.dataIntegrity}%` }}
                  aria-valuenow={frameworkStats.dataIntegrity}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>
            </div>
          </div>
        </div>
        {/* card 3 */}
        <div className="p-6 pt-0 pb-0 pl-0 pr-0">
          <div className="card p-3 md:p-6 pb-0 mt-6">
            <h2 className="text-md md:text-2xl font-bold dark:text-white ">
              SQL Server Connection
            </h2>
            <p className="text-md md:text-lg mt-2 font-semibold dark:text-white">
              Connected to:{' '}
              <span className="text-gray-500 dark:text-gray-600 md:text-md text-xs">
                Framework.database.windows.net,1433 | Database: Framework
              </span>
            </p>
            <span className="text-gray-700 dark:text-gray-600 text-bold md:text-md text-sm">
              Last checked: {new Date().toLocaleTimeString()}
            </span>{' '}
            <div className="sm:flex pt-4 sm:justify-between pb-3">
              <div className="mb-3 sm:mb-0">
                {isLoading ? (
                  <span className="p-0.5 rounded-2xl px-4 bg-gray-400 text-sm text-white flex items-center">
                    Checking...
                  </span>
                ) : isError || !connectionStatus?.connected ? (
                  <span className="p-0.5 rounded-2xl px-4 bg-danger text-sm text-white font-bold  items-center">
                    <i className="ki-solid ki-arrow-up-refraction mr-1 font-bold "></i>
                    Disconnected
                  </span>
                ) : (
                  <span className="p-0.5 rounded-2xl px-4 bg-green-500 text-sm text-white font-bold items-center">
                    <i className="ki-solid ki-arrow-down-refraction mr-1 font-bold "></i>
                    Connected
                  </span>
                )}
              </div>

              <div>
                <button
                  className="btn btn-outline btn-primary text-md"
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  {isLoading ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* card 4 */}
        {/* Card 4 — Auto-aligned 4 per row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 3xl:grid-cols-3 gap-6 w-full p-6 pl-0 pb-0 pr-0">
          {Array.isArray(modules) &&
          modules.map((module) => (
            <div className="card" key={module.id}>
              <div className="md:card-header p-3">
                <div>
                  <h3 className="font-bold text-md md:text-xl">{module.title}</h3>
                  <p className="text-gray-500 text-xs md:text-md">{module.description}</p>
                </div>
              </div>
              {/* Added Section */}
              <div className="mt-0 pt-0 pb-4 px-6">
                {/* Module Summary Row */}
                <div className="flex justify-between gap-3 md:p-6 pb-0">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center size-7.5 shrink-0 bg-gray-100 rounded-lg border border-gray-300">
                      <LucideIcons.Folder className="w-4 h-4 text-gray-600" />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span className="text-md font-medium text-gray-900 cursor-pointer hover:text-primary mb-px">
                        Tables
                      </span>
                      <span className="text-2xs text-gray-700">Total Tables</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-sm text-gray-800">{module.count} tables</span>
                  </div>
                </div>

                {/* Individual Tables */}
                {module.tables.map((table: any, index: number) => (
                  <div className="flex justify-between gap-3 md:p-6 pt-4 md:pt-0" key={index}>
                    <div className="flex items-center gap-2.5">
                      {/* Icon for each table */}
                      <div className="flex items-center justify-center size-7.5 shrink-0 bg-gray-100 rounded-lg border border-gray-300">
                        {(() => {
                          // SAFE ACCESS — prevents any crash
                          const rawIcon = table?.icon;

                          // If icon is missing, null, empty, or not a string → fallback
                          if (!rawIcon || typeof rawIcon !== 'string' || rawIcon.trim() === '') {
                            return <LucideIcons.Database className="w-4 h-4 text-gray-400" />;
                          }

                          // Safe string manipulation
                          const iconName = rawIcon.charAt(0).toUpperCase() + rawIcon.slice(1);

                          // Safely lookup icon component
                          const IconComponent = (
                            LucideIcons as unknown as Record<string, React.ComponentType<any>>
                          )[iconName];

                          // If icon exists, show it — else fallback
                          return IconComponent ? (
                            <IconComponent className="w-4 h-4 text-gray-600" />
                          ) : (
                            <LucideIcons.Database className="w-4 h-4 text-gray-400" />
                          );
                        })()}
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-md font-medium text-gray-900 cursor-pointer hover:text-primary mb-px">
                          {table.name}
                        </span>
                        <span className="text-2xs text-gray-700">Active {table.name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="text-sm text-gray-800">{table.count} active</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Manage Button */}
              <div className="flex justify-between gap-3 p-10 pb-5 mt-auto">
                <button
                  className="btn btn-outline btn-primary w-full text-xs sm:text-md justify-center"
                  onClick={() => navigate(module.id)}
                >
                  Manage {module.title}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default FrameworkDashboard;


