import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Upload,
  Activity,
  FileText,
  Settings,
  Radio,
  X,
  Menu,
} from "lucide-react";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "upload", label: "Upload", icon: Upload },
  { id: "analysis", label: "Analysis", icon: Activity },
  { id: "device", label: "Device Integration", icon: Radio },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

const MOBILE_BP = 1024;

export default function Sidebar({
  activePage,
  onNavigate,
  collapsed,
  onToggle,
}) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BP);

  useEffect(() => {
    let mounted = true;
    const handleResize = () => {
      if (mounted) setIsMobile(window.innerWidth < MOBILE_BP);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      mounted = false;
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const isOpen = !collapsed;
  const hideLabels = collapsed && !isMobile;

  const handleNavClick = (id) => {
    onNavigate(id);
    if (isMobile) onToggle();
  };

  return (
    <>
      {isMobile && (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onToggle}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                zIndex: 98,
              }}
            />
          )}
        </AnimatePresence>
      )}

      <motion.aside
        initial={false}
        animate={
          isMobile
            ? { x: isOpen ? 0 : "-100%" }
            : {
                width: isOpen
                  ? "var(--sidebar-width)"
                  : "var(--sidebar-collapsed)",
              }
        }
        transition={{ duration: 0.25, ease: "easeInOut" }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 99,
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          width: isMobile
            ? 280
            : isOpen
              ? "var(--sidebar-width)"
              : "var(--sidebar-collapsed)",
          ...(isMobile && isOpen ? { boxShadow: "var(--shadow-lg)" } : {}),
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: hideLabels ? "center" : "space-between",
            padding: hideLabels ? "16px 0" : "16px 20px",
            borderBottom: "1px solid var(--border)",
            minHeight: 64,
          }}
        >
          <button
            onClick={() => onNavigate("welcome")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: hideLabels ? "center" : "flex-start",
              gap: 10,
              flex: 1,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-primary)",
              padding: 0,
            }}
          >
            <img
              src="/lumina-logo-nobg.png"
              alt="Lumina"
              style={{
                height: 28,
                width: 28,
                borderRadius: 6,
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
            {!hideLabels && (
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                }}
              >
                Lumina
              </span>
            )}
          </button>
          <button
            onClick={onToggle}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              padding: 4,
              borderRadius: "var(--radius-sm)",
              transition: "color 0.2s",
            }}
            className="sidebar-toggle-btn"
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: hideLabels ? "12px 8px" : "12px 10px",
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <motion.button
                key={item.id}
                whileHover={{ x: hideLabels ? 0 : 4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleNavClick(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: hideLabels ? "center" : "flex-start",
                  gap: 12,
                  padding: hideLabels ? "10px" : "10px 14px",
                  borderRadius: "var(--radius-md)",
                  background: isActive ? "var(--accent-dim)" : "transparent",
                  border: "none",
                  color: isActive ? "var(--accent)" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  transition: "background 0.2s, color 0.2s",
                  position: "relative",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
                title={hideLabels ? item.label : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 3,
                      height: 20,
                      background: "var(--accent)",
                      borderRadius: "0 3px 3px 0",
                      boxShadow: "0 0 8px var(--accent-glow)",
                    }}
                  />
                )}
                <Icon size={18} />
                {!hideLabels && item.label}
              </motion.button>
            );
          })}
        </nav>

        <div
          style={{
            padding: hideLabels ? "12px 0" : "12px 16px",
            borderTop: "1px solid var(--border)",
            textAlign: hideLabels ? "center" : "left",
          }}
        >
          {!hideLabels && (
            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                letterSpacing: "0.05em",
              }}
            >
              Lumina v1.0
            </span>
          )}
        </div>
      </motion.aside>
    </>
  );
}
