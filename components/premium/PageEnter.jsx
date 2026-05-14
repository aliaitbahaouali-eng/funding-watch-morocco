'use client';
import { motion } from 'framer-motion';

/** Animation d'entrée de page : fade + slide up avec stagger pour les enfants. */
export default function PageEnter({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Stagger container pour animer une liste d'enfants en cascade. */
export function StaggerGroup({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.06, delayChildren: delay } }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Item enfant d'un StaggerGroup. */
export function StaggerItem({ children, className = '' }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
