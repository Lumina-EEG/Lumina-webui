import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Upload,
  Activity,
  FileText,
  Settings,
  ChevronLeft,
  Menu,
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'analysis', label: 'Analysis', icon: Activity },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activePage, onNavigate, collapsed, onToggle }) {
  return (
    <>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onToggle}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 98,
            }}
            className="sidebar-overlay"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)' }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 99,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: collapsed ? '16px 0' : '16px 20px',
            borderBottom: '1px solid var(--border)',
            minHeight: 64,
          }}
        >
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img
                src="/lumina-logo.jpeg"
                alt="Lumina"
                style={{ height: 28, width: 28, borderRadius: 6, objectFit: 'cover' }}
              />
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                }}
              >
                Lumina
              </span>
            </div>
          )}
          {collapsed && (
            <img
              src="/lumina-logo.jpeg"
              alt="Lumina"
              style={{ height: 28, width: 28, borderRadius: 6, objectFit: 'cover' }}
            />
          )}
          <button
            onClick={onToggle}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 'var(--radius-sm)',
              transition: 'color 0.2s',
              opacity: collapsed ? 1 : 0.7,
            }}
            className="sidebar-toggle-btn"
          >
            {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            padding: collapsed ? '12px 8px' : '12px 10px',
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <motion.button
                key={item.id}
                whileHover={{ x: collapsed ? 0 : 4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  gap: 12,
                  padding: collapsed ? '10px' : '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'var(--accent-dim)' : 'transparent',
                  border: 'none',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  transition: 'background 0.2s, color 0.2s',
                  position: 'relative',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
                title={collapsed ? item.label : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: 20,
                      background: 'var(--accent)',
                      borderRadius: '0 3px 3px 0',
                      boxShadow: '0 0 8px var(--accent-glow)',
                    }}
                  />
                )}
                <Icon size={18} />
                {!collapsed && item.label}
              </motion.button>
            );
          })}
        </nav>

        <div
          style={{
            padding: collapsed ? '12px 0' : '12px 16px',
            borderTop: '1px solid var(--border)',
            textAlign: collapsed ? 'center' : 'left',
          }}
        >
          {!collapsed && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Lumina v1.0
            </span>
          )}
        </div>
      </motion.aside>
    </>
  );
}
