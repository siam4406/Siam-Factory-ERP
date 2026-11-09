import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import {
  LayoutDashboard, ShoppingCart, Package, Factory, Cpu, Warehouse,
  TrendingUp, DollarSign, Settings, BarChart3, Download, Bell,
  Menu, X, LogOut, Wrench, Search, Users, Activity,
  AlertTriangle, Recycle, ArrowUpDown, Calculator
} from 'lucide-react';

const navGroups = [
  {
    label: 'Main',
    items: [
      { path: '/',              icon: LayoutDashboard, label: 'Dashboard'      },
      { path: '/orders',        icon: ShoppingCart,    label: 'Orders'         },
      { path: '/customers',     icon: Users,           label: 'Customers'      },
    ],
  },
  {
    label: 'Factory',
    items: [
      { path: '/production',    icon: Factory,   label: 'Production'     },
      { path: '/cap-production',icon: Cpu,       label: 'Cap Production' },
      { path: '/materials',     icon: Package,   label: 'Raw Materials'  },
      { path: '/inventory',     icon: Warehouse, label: 'Inventory'      },
      { path: '/machines',      icon: Wrench,    label: 'Machines & Dies'},
    ],
  },
  {
    label: 'Finance',
    items: [
      { path: '/sales',         icon: TrendingUp,  label: 'Sales'          },
      { path: '/expenses',      icon: DollarSign,  label: 'Expenses'       },
      { path: '/profit',        icon: Calculator,  label: 'Profit Calc'    },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { path: '/reports',       icon: BarChart3,   label: 'Reports'         },
      { path: '/scrap',         icon: Recycle,     label: 'Scrap & Rejects' },
      { path: '/movements',     icon: ArrowUpDown, label: 'Stock Movements' },
      { path: '/activity',      icon: Activity,    label: 'Activity Log'    },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/notifications', icon: Bell,          label: 'Notifications'  },
      { path: '/rules',         icon: AlertTriangle, label: 'Business Rules' },
      { path: '/backup',        icon: Download,      label: 'Backup'         },
      { path: '/settings',      icon: Settings,      label: 'Settings'       },
    ],
  },
];

const allNavItems = navGroups.flatMap(g => g.items);

const pageTitles = {
  '/search':        'Search',
  '/profit':        'Profit Calculator',
  '/scrap':         'Scrap Management',
  '/movements':     'Stock Movements',
  '/activity':      'Activity Log',
  '/notifications': 'Notifications',
  '/rules':         'Business Rules',
};

const bottomNavItems = [
  { path: '/',           icon: LayoutDashboard, label: 'Dashboard'  },
  { path: '/orders',     icon: ShoppingCart,    label: 'Orders'     },
  { path: '/production', icon: Factory,         label: 'Production' },
  { path: '/sales',      icon: TrendingUp,      label: 'Sales'      },
  { path: '/search',     icon: Search,          label: 'Search'     },
];

export const MainLayout = ({ children }) => {
  const { factoryName, notifications, sidebarOpen, setSidebarOpen, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const currentPage =
    allNavItems.find(n => n.path === location.pathname)?.label ||
    pageTitles[location.pathname] ||
    'Dashboard';

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full z-50 w-64 bg-gray-900 border-r border-gray-700/50 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}>
        <div className="p-4 border-b border-gray-700/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/30">
              <Factory size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate leading-tight">{factoryName}</p>
              <p className="text-xs text-blue-400/70 font-medium">ERP v2.0</p>
            </div>
            <button className="lg:hidden text-gray-400 hover:text-white p-1" onClick={() => setSidebarOpen(false)}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-3 pt-3 shrink-0">
          <button
            onClick={() => { navigate('/search'); setSidebarOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 bg-gray-800/80 border border-gray-700/50 rounded-lg text-gray-400 hover:text-white hover:border-blue-500/40 transition-all text-sm"
          >
            <Search size={14} />
            <span className="text-xs">Search anything…</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navGroups.map(group => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest px-3 mb-1">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(({ path, icon: Icon, label }) => (
                  <NavLink
                    key={path}
                    to={path}
                    end={path === '/'}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800/80'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={17} />
                        <span className="flex-1">{label}</span>
                        {path === '/notifications' && notifications.length > 0 && (
                          <span className="flex items-center justify-center w-5 h-5 bg-red-500 rounded-full text-xs font-bold text-white">
                            {notifications.length > 9 ? '9+' : notifications.length}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-2 border-t border-gray-700/50 shrink-0">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="shrink-0 h-14 bg-gray-900/90 backdrop-blur-md border-b border-gray-700/50 flex items-center px-4 gap-3 z-30">
          <button className="lg:hidden p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white truncate">{currentPage}</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate('/search')}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-800/80 border border-gray-700/50 rounded-lg text-gray-400 hover:text-white hover:border-blue-500/30 transition-all text-xs"
            >
              <Search size={13} /><span>Search</span>
            </button>
            <NavLink to="/notifications" className="relative p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-gray-900" />
              )}
            </NavLink>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
          <div className="p-4 max-w-5xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-gray-900/98 backdrop-blur-md border-t border-gray-700/50 flex">
        {bottomNavItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 px-1 text-xs transition-all ${isActive ? 'text-blue-400' : 'text-gray-500'}`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-500/20' : ''}`}>
                  <Icon size={19} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className="mt-0.5 leading-tight font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
