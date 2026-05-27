import { memo } from 'react';
import { motion } from 'framer-motion';

export const Modal = memo(({ isOpen, onClose, title, children, size = 'lg' }) => {
  if (!isOpen) return null;

  const backdropVariants = {
      visible: { opacity: 1 },
      hidden: { opacity: 0 }
  };

  const modalVariants = {
      hidden: { y: "-50vh", opacity: 0 },
      visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
      exit: { y: "50vh", opacity: 0 }
  };

  const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      '3xl': 'max-w-3xl',
  };

  return (
    <motion.div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" 
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      onClick={onClose}
    >
      <motion.div 
        className={`bg-white rounded-lg shadow-2xl w-full flex flex-col border border-gray-200 ${sizeClasses[size]}`} 
        style={{ maxHeight: '90vh' }} 
        variants={modalVariants}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-shrink-0 p-6 pb-4 flex justify-between items-center border-b border-gray-200">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">{title}</h2>
            <button onClick={onClose} className="text-3xl text-gray-400 hover:text-red-500 leading-none transition-colors">×</button>
        </div>
        <div className="flex-grow p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
});
