import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  BarChart3,
  Shield,
  Activity,
  Zap,
  Radio,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

export default function WelcomePage({ onNavigate }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        background: "var(--bg-primary)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* NAV */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(2, 11, 28, 0.85)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src="/lumina-logo-only.png"
            alt="Lumina"
            style={{
              height: 30,
              width: 30,
              borderRadius: 6,
              objectFit: "cover",
            }}
          />
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            Lumina
          </span>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onNavigate("dashboard")}
          style={{
            padding: "8px 20px",
            borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, var(--accent), #2563EB)",
            border: "none",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Launch App
        </motion.button>
      </nav>

      {/* HERO */}
      <motion.section
        initial="initial"
        animate="animate"
        variants={stagger}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "60px 24px 40px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59,164,255,0.06) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        />

        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background:
                "linear-gradient(135deg, var(--accent-dim), rgba(59,164,255,0.05))",
              border: "1px solid rgba(59,164,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Brain size={28} color="var(--accent)" />
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--accent)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            AI-powered EEG Diagnostics
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            fontSize: "clamp(32px, 6vw, 56px)",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.12,
            letterSpacing: "-0.03em",
            maxWidth: 700,
            marginBottom: 16,
          }}
        >
          Intelligent EEG Analysis
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, var(--accent), #60A5FA)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            for Modern Neurology
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            fontSize: "clamp(15px, 2vw, 17px)",
            color: "var(--text-secondary)",
            lineHeight: 1.7,
            maxWidth: 560,
            marginBottom: 36,
          }}
        >
          Lumina combines deep learning with clinical expertise to deliver
          rapid, accurate EEG interpretation. Upload recordings, receive
          AI-generated diagnostics and comprehensive clinical reports.
        </motion.p>

        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onNavigate("dashboard")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 32px",
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, var(--accent), #2563EB)",
              border: "none",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 24px rgba(59,164,255,0.25)",
            }}
          >
            Start Analysis
            <ArrowRight size={18} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onNavigate("device")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 28px",
              borderRadius: "var(--radius-md)",
              background: "transparent",
              border: "1px solid var(--border-hover)",
              color: "var(--text-secondary)",
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <Radio size={16} />
            Device Integration
          </motion.button>
        </motion.div>
      </motion.section>

      {/* FEATURES */}
      <motion.section
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        style={{
          padding: "60px 24px 80px",
          maxWidth: 1100,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          style={{ textAlign: "center", marginBottom: 48 }}
        >
          <h2
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 8,
              letterSpacing: "-0.02em",
            }}
          >
            Purpose-built for EEG Analysis
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "var(--text-secondary)",
              maxWidth: 500,
              margin: "0 auto",
            }}
          >
            From raw waveforms to clinical insights — Lumina streamlines the
            entire EEG diagnostic workflow.
          </p>
        </motion.div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {[
            {
              icon: Activity,
              title: "Multichannel EEG Viewing",
              desc: "Interactive waveform viewer with per-channel color coding, zoom, and amplitude controls for detailed signal inspection.",
            },
            {
              icon: Brain,
              title: "AI-Powered Diagnostics",
              desc: "Deep learning models trained on clinical EEG datasets for accurate classification of neurological conditions.",
            },
            {
              icon: BarChart3,
              title: "Model Attention Heatmap",
              desc: "Visual attribution maps showing which signal regions drove each diagnostic decision, enabling interpretable AI.",
            },
            {
              icon: Zap,
              title: "Rapid Processing",
              desc: "End-to-end pipeline from file upload to clinical report in under a minute, with real-time status updates.",
            },
            {
              icon: Shield,
              title: "Clinical-Grade Reports",
              desc: "Auto-generated clinical notes with structured findings, formatted for EHR integration and clinical review.",
            },
            {
              icon: Radio,
              title: "EEG Device Ready",
              desc: "Planned support for direct streaming from hospital EEG systems and real-time monitoring applications.",
            },
          ].map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                style={{
                  padding: 24,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--glass-bg)",
                  border: "1px solid var(--glass-border)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "var(--radius-md)",
                    background: "var(--accent-dim)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 14,
                  }}
                >
                  <Icon size={20} color="var(--accent)" />
                </div>
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: 6,
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  style={{
                    fontSize: 13.5,
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                  }}
                >
                  {feature.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* EEG INTEGRATION PREVIEW */}
      <motion.section
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        style={{
          padding: "60px 24px 80px",
          maxWidth: 1000,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          style={{
            borderRadius: "var(--radius-xl)",
            background:
              "linear-gradient(135deg, rgba(59,164,255,0.08), rgba(37,99,235,0.04))",
            border: "1px solid rgba(59,164,255,0.12)",
            padding: "48px 32px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              width: 300,
              height: 300,
              borderRadius: "50%",
              border: "1px solid rgba(59,164,255,0.06)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
            }}
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              width: 450,
              height: 450,
              borderRadius: "50%",
              border: "1px solid rgba(59,164,255,0.04)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "var(--accent-dim)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              position: "relative",
              zIndex: 1,
            }}
          >
            <Radio size={26} color="var(--accent)" />
          </div>

          <h2
            style={{
              fontSize: "clamp(22px, 3vw, 30px)",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 12,
              letterSpacing: "-0.02em",
              position: "relative",
              zIndex: 1,
            }}
          >
            Direct EEG Machine Integration
          </h2>
          <p
            style={{
              fontSize: 14.5,
              color: "var(--text-secondary)",
              maxWidth: 520,
              margin: "0 auto 28px",
              lineHeight: 1.7,
              position: "relative",
              zIndex: 1,
            }}
          >
            Lumina is being built for real-time EEG streaming and direct
            hospital system integration. Connect EEG devices for live monitoring
            and instant AI analysis at the point of care.
          </p>

          <div
            style={{
              display: "flex",
              gap: 16,
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: 28,
              position: "relative",
              zIndex: 1,
            }}
          >
            {[
              "Real-time Streaming",
              "Hospital EMR Ready",
              "Live Monitoring",
            ].map((tag) => (
              <span
                key={tag}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  background: "var(--bg-surface-secondary)",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--accent)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate("device")}
            style={{
              padding: "12px 28px",
              borderRadius: "var(--radius-md)",
              background: "transparent",
              border: "1px solid var(--border-hover)",
              color: "var(--text-secondary)",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              position: "relative",
              zIndex: 1,
            }}
          >
            Learn More
          </motion.button>
        </motion.div>
      </motion.section>

      {/* CTA */}
      <motion.section
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        style={{
          padding: "60px 24px 80px",
          textAlign: "center",
        }}
      >
        <motion.h2
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          style={{
            fontSize: "clamp(24px, 3.5vw, 36px)",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 12,
            letterSpacing: "-0.02em",
          }}
        >
          Ready to analyze EEG data?
        </motion.h2>
        <motion.p
          variants={fadeUp}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            fontSize: 15,
            color: "var(--text-secondary)",
            maxWidth: 440,
            margin: "0 auto 32px",
            lineHeight: 1.7,
          }}
        >
          Upload your first EEG recording and experience AI-powered neurological
          diagnostics.
        </motion.p>
        <motion.button
          variants={fadeUp}
          transition={{ duration: 0.5, delay: 0.2 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => onNavigate("upload")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 36px",
            borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, var(--accent), #2563EB)",
            border: "none",
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 24px rgba(59,164,255,0.25)",
          }}
        >
          Upload EEG Recording
          <ArrowRight size={18} />
        </motion.button>
      </motion.section>

      {/* FOOTER */}
      <footer
        style={{
          padding: "24px 32px",
          borderTop: "1px solid var(--border)",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            letterSpacing: "0.03em",
          }}
        >
          Lumina EEG Diagnostic Platform &middot; AI-assisted clinical decision
          support
        </p>
      </footer>
    </div>
  );
}
