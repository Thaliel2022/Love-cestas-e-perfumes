import React, { useState, useEffect, createContext, useContext, useCallback, memo, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// --- Constante da API ---
const API_URL = process.env.REACT_APP_API_URL || 'https://love-cestas-e-perfumes.onrender.com/api';

// --- ÍCONES SVG ---
const CartIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const HeartIcon = ({ className, filled }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.5l1.318-1.182a4.5 4.5 0 116.364 6.364L12 20.25l-7.682-7.682a4.5 4.5 0 010-6.364z" /></svg>;
const UserIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const AdminIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const MenuIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;
const CloseIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const StarIcon = memo(({ className, isFilled, onClick }) => <svg onClick={onClick} xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} viewBox="0 0 20 20" fill={isFilled ? "currentColor" : "none"} stroke="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>);
const PlusIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;
const TrashIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const EditIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>;
const ChartIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const BoxIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
const TruckIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h2a1 1 0 001-1V6a1 1 0 00-1-1h-2v11z" /></svg>;
const UsersIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A6.995 6.995 0 0112 12a6.995 6.995 0 016-3.803M15 21a6 6 0 00-9-5.197" /></svg>;
const TagIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a2 2 0 012 2v5a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zm0 0v11a2 2 0 002 2h5a2 2 0 002-2l-7-7z" /></svg>;
const FileIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
const UploadIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const InstagramIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>;
const WhatsappIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.315 1.731 6.26l.16.288-1.035 3.803 3.91-1.019.28.169z"/></svg>;
const SearchIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const CheckCircleIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ExclamationIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const CreditCardIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const SpinnerIcon = ({ className }) => <svg className={className || "h-5 w-5 animate-spin"} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const ClockIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const PackageIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
const CheckBadgeIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>;
const HomeIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const XCircleIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CurrencyDollarIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 6v-1m0 1H9m3 0h3m-3 10v-1m0 1h3m-3 0H9m12-6a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const MapPinIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const CheckIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
const PlusCircleIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ExclamationCircleIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const DownloadIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const ChevronDownIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;
const ShirtIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 10.318a4.5 4.5 0 000 5.364L6.414 18H17.586l2.096-2.318a4.5 4.5 0 000-5.364L17.586 8H6.414L4.318 10.318zM12 8v10" /></svg>;
const RulerIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16M8 4v4m8-4v4" /></svg>;
const SparklesIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
const XMarkIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const EyeIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const EyeOffIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7 .946-3.11 3.563-5.524 6.858-6.39M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.593 4.407A9.953 9.953 0 0121.542 12c-1.274 4.057-5.064 7-9.542 7a10.05 10.05 0 01-2.125-.3" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 1l22 22" /></svg>;
const SaleIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a2 2 0 012 2v5a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const ShareIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002L15.316 6.342a3 3 0 110 2.684m-6.632-2.684a3 3 0 000 2.684" /></svg>;
const ChevronUpIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>;
const CameraIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const BarsGripIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={className}><path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1Z M2 8a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1Z" /></svg>;
const PixIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className={className}><path fill="#32BCAD" d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24ZM119.2 136.8a32 32 0 0 1 0-17.6l44-25.4a4 4 0 0 1 5.6 3.2V156a4 4 0 0 1-5.6 3.2Zm51.2 29.6-44-25.4a32 32 0 0 1-16.8 0l-44 25.4a8 8 0 0 1-9.6-7.2V96a8 8 0 0 1 9.6-7.2l44 25.4a32 32 0 0 1 16.8 0l44-25.4a8 8 0 0 1 9.6 7.2v64a8 8 0 0 1-9.6 7.2Z"/></svg>;
const VisaIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 122" className={className}><path fill="#142688" d="M379.3 1.8c-2.3-1-5.1-1.3-7.8-.8L10.3 35.5C4.5 37-1.3 42.6.4 48.7l28.9 104.4c1.7 6.1 7.5 10.3 13.8 10.3h288c5.1 0 9.8-3.1 11.8-7.7l37.1-85.1C387.8 59.8 381.6 2.8 379.3 1.8z"/><path fill="#ffffff" d="M285.3 49.3l-20.7 70.9-20.1-70.9h-18.3l29.4 94.4h20.6l29.4-94.4h-19.9zM191.7 49.3c-11.4 0-18.1 6.8-18.1 15.6 0 6.6 4.3 11.2 11.4 14.5l6.9 3.1c3.4 1.5 4.5 3.1 4.5 5.2 0 3.3-2.9 4.6-6.1 4.6-4.5 0-7.3-1.4-9.9-2.8l-1.9-1.1-2.1 12.1c2.8 1.4 6.7 2.4 11.2 2.4 12.3 0 19.3-6.4 19.3-16.4 0-7.3-4.5-12-12-15.3l-6.8-3c-3.1-1.4-4.4-2.8-4.4-4.9 0-2.1 2.2-3.8 5.7-3.8 3.6 0 6.1 1.2 8.3 2.3l1.5.8 2-11.6c-2.4-1.1-5.7-2-9.6-2zM337.3 49.3h-14.2c-2.7 0-4.5 1.1-5.2 3.8l-23.3 84.6h19.5l4-15.1h20.9l2.4 15.1h18.2L337.3 49.3zm-17.6 57.3l8.7-31.8 4.8 31.8h-13.5zM128.2 60.6c0-23.1 13-28.9 25.1-28.9 8.2 0 15.4 2.8 20.9 5.7l-4.2 15.3c-4-2.4-9.3-4.2-14.8-4.2-5.7 0-9.4 3-9.4 8s3.7 8 9.4 8c5.4 0 10.8-1.8 14.8-4.2l4.2 15.3c-5.5 2.9-12.7 5.7-20.9 5.7-12.1 0-25.1-5.7-25.1-28.9z"/></svg>;
const MastercardIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40" className={className}><circle cx="20" cy="20" r="20" fill="#EB001B"/><circle cx="40" cy="20" r="20" fill="#F79E1B"/><path d="M30 20a20 20 0 0 1-10 17.32a20 20 0 0 1 0-34.64A20 20 0 0 1 30 20z" fill="#FF5F00"/></svg>;
const EloIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 81 48" className={className}><circle cx="67.5" cy="24" r="13.5" fill="#FAB51A"/><path d="M40.5 48a24 24 0 1 1 0-48a24 24 0 0 1 0 48z" fill="#000"/><path d="M22.5 24a13.5 13.5 0 1 1-27 0a13.5 13.5 0 0 1 27 0z" fill="#FAB51A"/></svg>;
const BoletoIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className={className}><path fill="currentColor" d="M0 128c0-35.3 28.7-64 64-64H512c35.3 0 64 28.7 64 64v256c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V128zM128 160V352h32V160H128zm64 0V352h64V160H192zm96 0V352h32V160H288zm64 0V352h64V160H352zm96 0V352h32V160H448z"/></svg>;
const PhotoIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-3.69l-2.78-2.78a.75.75 0 0 0-1.06 0L12 12.69l-2.22-2.22a.75.75 0 0 0-1.06 0L1.5 11.06ZM15 7a1 1 0 1 1-2 0a1 1 0 0 1 2 0Z" clipRule="evenodd" /></svg>;
const ClipboardDocListIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path d="M5.5 16.5a1.5 1.5 0 0 1-1.5-1.5V5.75a.75.75 0 0 1 1.5 0v9.25a.25.25 0 0 0 .25.25h9.25a.75.75 0 0 1 0 1.5H5.5Z" /><path fillRule="evenodd" d="M8 3.5a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 8 15.5h9a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 17 3.5H8Zm3.75 4a.75.75 0 0 0-1.5 0v.5a.75.75 0 0 0 1.5 0v-.5ZM10.5 9.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Zm.03 2.5a.75.75 0 0 0-1.06 0l-.72.72a.75.75 0 0 0 1.06 1.06l.72-.72a.75.75 0 0 0 0-1.06Z" clipRule="evenodd" /></svg>;
const PaperAirplaneIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.949a.75.75 0 0 0 .135.252l.918.919a.75.75 0 0 1 0 1.06l-.918.92a.75.75 0 0 0-.135.252L2.28 16.76a.75.75 0 0 0 .95.826l14.666-4.954a.75.75 0 0 0 0-1.42L3.105 2.289Z" /></svg>;
const CurrencyDollarArrowIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clipRule="evenodd" /><path d="M8.293 6.293a1 1 0 0 1 1.414 0l2.5 2.5a1 1 0 0 1 0 1.414l-2.5 2.5a1 1 0 0 1-1.414-1.414L9.586 10 8.293 8.707a1 1 0 0 1 0-1.414Z" /></svg>;
const ArrowUturnLeftIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M15 10a.75.75 0 0 1-.75.75H7.707l2.293 2.293a.75.75 0 1 1-1.06 1.06l-3.5-3.5a.75.75 0 0 1 0-1.06l3.5-3.5a.75.75 0 0 1 1.06 1.06L7.707 9.25H14.25A.75.75 0 0 1 15 10Z" clipRule="evenodd" /></svg>;
const ShieldCheckIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M10 1a.75.75 0 0 1 .75.75v1.252a1.75 1.75 0 0 1 2.476 1.222l.17.682a.75.75 0 0 1-1.42.354l-.17-.682a.25.25 0 0 0-.353-.175.75.75 0 0 1-.586 0 .25.25 0 0 0-.353.175l-.17.682a.75.75 0 0 1-1.42-.354l.17-.682A1.75 1.75 0 0 1 9.25 3.002V1.75A.75.75 0 0 1 10 1ZM5.113 4.634a.75.75 0 0 1 1.06 0l1.592 1.591a.75.75 0 0 1-1.06 1.06l-1.592-1.59a.75.75 0 0 1 0-1.061Zm8.714 0a.75.75 0 0 1 0 1.06l-1.591 1.591a.75.75 0 1 1-1.06-1.06l1.59-1.591a.75.75 0 0 1 1.061 0ZM10 4.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75ZM10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-2.207-6.207a1 1 0 0 1 1.414 0L10 12.586l.793-.793a1 1 0 1 1 1.414 1.414l-1.5 1.5a1 1 0 0 1-1.414 0l-2.5-2.5a1 1 0 0 1 0-1.414Z" clipRule="evenodd" /></svg>;

// --- FUNÇÕES AUXILIARES DE FORMATAÇÃO E VALIDAÇÃO ---
const validateCPF = (cpf) => {
    cpf = String(cpf).replace(/[^\d]/g, ''); 
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let sum = 0, remainder;
    for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;
    return true;
};

const maskCPF = (value) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .substring(0, 14);
};

const maskPhone = (value) => {
    return value
        .replace(/\D/g, '')
        .replace(/^(\d{2})(\d)/g, '($1) $2')
        .replace(/(\d)(\d{4})$/, '$1-$2')
        .substring(0, 15);
};

const validatePhone = (phone) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 11;
};

const maskCEP = (value) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .substring(0, 9);
};

// --- SERVIÇO DE API (COM ABORTCONTROLLER) ---
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

async function apiService(endpoint, method = 'GET', body = null, options = {}) {
    const config = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Essencial para enviar cookies httpOnly
        signal: options.signal,
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const finalUrl = `${API_URL}${endpoint}`;
        const response = await fetch(finalUrl, config);
        const contentType = response.headers.get("content-type");
        
        let data;
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            // Se o token expirou, tenta renová-lo
            if (response.status === 401 && data.message && data.message.includes('Token expirado')) {
                if (isRefreshing) {
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    }).then(() => apiService(endpoint, method, body, options));
                }

                isRefreshing = true;
                return new Promise((resolve, reject) => {
                    apiService('/refresh-token', 'POST')
                        .then(() => {
                            processQueue(null);
                            resolve(apiService(endpoint, method, body, options));
                        })
                        .catch(err => {
                            processQueue(err);
                            // Apenas dispara evento se não estiver suprimido
                            if (!options.suppressAuthError) {
                                window.dispatchEvent(new Event('auth-error'));
                            }
                            reject(err);
                        })
                        .finally(() => {
                            isRefreshing = false;
                        });
                });
            }
             
             if (response.status === 401 || response.status === 403) {
                 // CORREÇÃO: Só redireciona se a chamada NÃO pediu para suprimir o erro (ex: checagem inicial)
                 if (!options.suppressAuthError) {
                    window.dispatchEvent(new Event('auth-error'));
                 }
             }

            const errorMessage = (typeof data === 'object' && data.message) ? data.message : (data || `Erro ${response.status}`);
            throw new Error(errorMessage);
        }

        return data;

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`API fetch aborted: ${endpoint}`);
        } else {
            console.error(`Erro na API (${endpoint}):`, error);
        }
        if (error instanceof TypeError) {
            throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão e se o backend está rodando.');
        }
        throw error;
    }
}


async function apiUploadService(endpoint, file) {
    const formData = new FormData();
    formData.append('file', file);

    const config = {
        method: 'POST',
        credentials: 'include', // Adicionado para enviar cookies de autenticação
        body: formData,
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const responseData = await response.json();
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.dispatchEvent(new Event('auth-error'));
            }
            throw new Error(responseData.message || `Erro ${response.status}`);
        }
        return responseData;
    } catch (error) {
        console.error(`Erro no upload (${endpoint}):`, error);
        throw error;
    }
}

async function apiImageUploadService(endpoint, file) {
    const formData = new FormData();
    formData.append('image', file);

    const config = {
        method: 'POST',
        credentials: 'include', // Adicionado para enviar cookies de autenticação
        body: formData,
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const responseData = await response.json();
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.dispatchEvent(new Event('auth-error'));
            }
            throw new Error(responseData.message || `Erro ${response.status}`);
        }
        return responseData;
    } catch (error) {
        console.error(`Erro no upload da imagem (${endpoint}):`, error);
        throw error;
    }
}

// Função auxiliar interna para evitar erros de referência
const parseJsonString = (jsonString, fallbackValue) => {
    if (!jsonString) return fallbackValue;
    try {
        const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
        return Array.isArray(parsed) ? parsed : fallbackValue;
    } catch (e) {
        console.error("Erro ao parsear JSON:", e);
        return fallbackValue;
    }
};

// --- OTIMIZAÇÃO AUTOMÁTICA CLOUDINARY ---
// Transforma URLs do Cloudinary para entregar WebP e qualidade automática
const optimizeCloudinaryUrl = (url, width = 'auto') => {
    if (!url || typeof url !== 'string') return url;
    if (url.includes('res.cloudinary.com')) {
        // Insere parâmetros de otimização após '/upload/'
        return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
    }
    return url;
};

const getFirstImage = (imagesJsonString, placeholder = 'https://placehold.co/600x400/222/fff?text=Produto') => {
    const images = parseJsonString(imagesJsonString, []);
    const rawUrl = (Array.isArray(images) && images.length > 0) ? images[0] : placeholder;
    return optimizeCloudinaryUrl(rawUrl);
};

// --- CONTEXTOS GLOBAIS ---
const AuthContext = createContext(null);
const ShopContext = createContext(null);
const NotificationContext = createContext(null);
const ConfirmationContext = createContext(null);

const useAuth = () => useContext(AuthContext);
const useShop = () => useContext(ShopContext);
const useNotification = () => useContext(NotificationContext);
const useConfirmation = () => useContext(ConfirmationContext);

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const logout = useCallback(async () => {
        try {
            await apiService('/logout', 'POST');
        } catch (error) {
            console.error("Erro na API de logout.", error);
        } finally {
            setUser(null);
            // Removemos o redirecionamento forçado aqui para evitar loops indesejados
            // O componente AppContent cuidará de redirecionar se a página exigir auth
            if (window.location.hash !== '#home' && window.location.hash !== '') {
                 window.location.hash = '#login';
            }
        }
    }, []);

    const fetchUserProfile = useCallback(async () => {
        try {
            // CORREÇÃO: Passamos suppressAuthError: true
            // Se falhar (401), apenas define user como null e não dispara o evento global de logout/redirecionamento
            const userData = await apiService('/users/me', 'GET', null, { suppressAuthError: true });
            setUser(userData);
        } catch (error) {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUserProfile();
    }, [fetchUserProfile]);

    useEffect(() => {
        const handleAuthError = () => {
            console.log("Sessão expirada. Logout.");
            logout();
        };
        window.addEventListener('auth-error', handleAuthError);
        return () => window.removeEventListener('auth-error', handleAuthError);
    }, [logout]);

    const login = async (email, password) => {
        const response = await apiService('/login', 'POST', { email, password });
        if (response && response.user) {
            setUser(response.user);
        }
        return response;
    };
    
    const register = async (name, email, password, cpf, phone) => {
        return await apiService('/register', 'POST', { name, email, password, cpf, phone });
    };

    return <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user, isLoading, setUser }}>{children}</AuthContext.Provider>;
};

const ShopProvider = ({ children }) => {
    const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
    const [cart, setCart] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    const [addresses, setAddresses] = useState([]);
    const [shippingLocation, setShippingLocation] = useState({ cep: '', city: '', state: '', alias: '' });
    const [autoCalculatedShipping, setAutoCalculatedShipping] = useState(null);
    const [shippingOptions, setShippingOptions] = useState([]);
    const [isLoadingShipping, setIsLoadingShipping] = useState(false);
    const [shippingError, setShippingError] = useState('');
    const [previewShippingItem, setPreviewShippingItem] = useState(null);
    const [selectedShippingName, setSelectedShippingName] = useState(null);
    const [isGeolocating, setIsGeolocating] = useState(false);
    const [couponCode, setCouponCode] = useState("");
    const [couponMessage, setCouponMessage] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState(null);

    // Novo estado para configuração de frete local
    const [localShippingConfig, setLocalShippingConfig] = useState({ base_price: 20, rules: [] });

    // --- NOVO: Estado para Notificações de Pedidos ---
    const [orderNotificationCount, setOrderNotificationCount] = useState(0);

    // Helpers internos
    const normalize = (str) => str ? String(str).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    const safeParse = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        try { return JSON.parse(val) || []; } catch { return []; }
    };

    // --- Busca notificações de pedidos (Polling) ---
    // Verifica no banco de dados se há pedidos com atualizações não vistas
    const checkNotifications = useCallback(async () => {
        if (!isAuthenticated) {
            setOrderNotificationCount(0);
            return;
        }
        try {
            const data = await apiService('/notifications/orders/count', 'GET', null, { suppressAuthError: true });
            if (data && typeof data.count === 'number') {
                setOrderNotificationCount(data.count);
            }
        } catch (error) {
            // Silencia erros de polling para não atrapalhar a UX
            // console.warn("Falha ao buscar notificações:", error);
        }
    }, [isAuthenticated]);

    // --- Marca pedido como visto ---
    const markOrderAsSeen = useCallback(async (orderId) => {
        if (!isAuthenticated) return;
        try {
            // Chama API para atualizar o status da notificação no banco
            await apiService(`/orders/${orderId}/mark-seen`, 'PUT');
            // Atualiza o contador localmente imediatamente para UX instantânea
            checkNotifications(); 
        } catch (error) {
            console.error("Erro ao marcar pedido como visto:", error);
        }
    }, [isAuthenticated, checkNotifications]);

    // Efeito para Polling de Notificações - INTERVALO REDUZIDO PARA 5 SEGUNDOS
    useEffect(() => {
        checkNotifications();
        // Verifica a cada 5 segundos se há novas atualizações
        const interval = setInterval(checkNotifications, 5000);
        return () => clearInterval(interval);
    }, [checkNotifications]);

    // --- LÓGICA DE CÁLCULO DE DATA (FERIADOS) ---
    const calculateDeliveryDate = useCallback((daysToAdd) => {
        const date = new Date();
        let added = 0;
        
        // Lista de Feriados Fixos (Dia/Mês)
        const holidays = [
            "01/01", // Confraternização Universal
            "21/04", // Tiradentes
            "01/05", // Dia do Trabalho
            "24/06", // São João (Forte no NE/JP)
            "07/09", // Independência
            "12/10", // N. Sra. Aparecida
            "02/11", // Finados
            "15/11", // Proclamação da República
            "25/12"  // Natal
        ];

        while (added < daysToAdd) {
            date.setDate(date.getDate() + 1);
            
            const dayOfWeek = date.getDay();
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const dateString = `${day}/${month}`;
            
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Domingo ou Sábado
            const isHoliday = holidays.includes(dateString);

            if (!isWeekend && !isHoliday) {
                added++;
            }
        }
        return date;
    }, []);
    
    // --- Fetch Configuração de Frete Local (Com Polling Automático) ---
    const fetchShippingConfig = useCallback(() => {
        apiService('/settings/shipping-local')
            .then(data => {
                setLocalShippingConfig(prev => {
                    if (JSON.stringify(prev) !== JSON.stringify(data)) {
                        return data;
                    }
                    return prev;
                });
            })
            .catch(err => console.error("Falha ao buscar config de frete local:", err));
    }, []);

    useEffect(() => {
        fetchShippingConfig(); 
        const intervalId = setInterval(fetchShippingConfig, 5000);
        return () => clearInterval(intervalId);
    }, [fetchShippingConfig]);

    const calculateLocalDeliveryPrice = useCallback((items) => {
        const defaultBasePrice = parseFloat(localShippingConfig.base_price) || 20;
        if (!items || items.length === 0) return defaultBasePrice;

        let highestBasePriceFound = 0;
        let totalSurcharges = 0;
        let totalDiscounts = 0;

        for (const item of items) {
            const itemCategory = normalize(item.category || "");
            const itemBrand = normalize(item.brand || "");
            let itemEffectiveBasePrice = defaultBasePrice; 
            
            if (localShippingConfig.rules && localShippingConfig.rules.length > 0) {
                for (const rule of localShippingConfig.rules) {
                    const ruleValue = normalize(rule.value);
                    const ruleAmount = parseFloat(rule.amount) || 0;
                    if (!ruleValue) continue;

                    let match = false;
                    if (rule.type === 'category' && (itemCategory === ruleValue || itemCategory.includes(ruleValue))) match = true;
                    if (rule.type === 'brand' && (itemBrand === ruleValue || itemBrand.includes(ruleValue))) match = true;

                    if (match) {
                        switch (rule.action) {
                            case 'free_shipping': itemEffectiveBasePrice = 0; break;
                            case 'surcharge': totalSurcharges += ruleAmount; break;
                            case 'discount': totalDiscounts += ruleAmount; break;
                            default: break;
                        }
                    }
                }
            }
            if (itemEffectiveBasePrice > highestBasePriceFound) {
                highestBasePriceFound = itemEffectiveBasePrice;
            }
        }
        let finalPrice = highestBasePriceFound + totalSurcharges - totalDiscounts;
        return Math.max(0, finalPrice); 
    }, [localShippingConfig]);

    const fetchPersistentCart = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const dbCart = await apiService('/cart');
            const localCartStr = localStorage.getItem('lovecestas_cart');
            let localCart = [];
            try { localCart = JSON.parse(localCartStr) || []; } catch(e){}
            const mergedCart = (dbCart || []).map(dbItem => {
                if (dbItem.variation && dbItem.variation.color && dbItem.variation.size) {
                    return { ...dbItem, cartItemId: `${dbItem.id}-${dbItem.variation.color}-${dbItem.variation.size}` };
                }
                if (dbItem.product_type === 'clothing') {
                    const localItem = localCart.find(li => li.id === dbItem.id && li.variation);
                    if (localItem && localItem.variation) {
                        return { ...dbItem, variation: localItem.variation, cartItemId: `${dbItem.id}-${localItem.variation.color}-${localItem.variation.size}` };
                    }
                }
                return { ...dbItem, cartItemId: dbItem.cartItemId || String(dbItem.id) };
            });
            setCart(mergedCart);
            localStorage.setItem('lovecestas_cart', JSON.stringify(mergedCart));
        } catch (err) { console.error("Falha ao buscar carrinho:", err); }
    }, [isAuthenticated]);

    const syncGuestCartToDB = useCallback(async () => {
        const localCartStr = localStorage.getItem('lovecestas_cart');
        if (!localCartStr) return;
        try {
            const localItems = JSON.parse(localCartStr);
            if (Array.isArray(localItems) && localItems.length > 0) {
                const promises = localItems.map(item => {
                    const payload = { productId: item.id, quantity: item.qty, variationId: item.variation?.id, variation: item.variation, variation_details: item.variation ? JSON.stringify(item.variation) : null };
                    return apiService('/cart', 'POST', payload).catch(err => console.warn("Item duplicado/erro sync:", err));
                });
                await Promise.all(promises);
            }
        } catch (e) { console.error("Erro sync carrinho:", e); }
    }, []);

    const fetchAddresses = useCallback(async () => {
        if (!isAuthenticated) return [];
        try {
            const userAddresses = await apiService('/addresses');
            setAddresses(userAddresses || []);
            return userAddresses || [];
        } catch (error) { setAddresses([]); return []; }
    }, [isAuthenticated]);

    const updateDefaultShippingLocation = useCallback((addrs) => {
        const defaultAddr = addrs.find(addr => addr.is_default) || addrs[0];
        if (defaultAddr) {
            setShippingLocation({ cep: defaultAddr.cep, city: defaultAddr.localidade, state: defaultAddr.uf, alias: defaultAddr.alias });
            return true;
        }
        return false;
    }, []);

    const determineShippingLocation = useCallback(async () => {
        let locationDetermined = false;
        if (isAuthenticated) {
            const userAddresses = await fetchAddresses();
            if (userAddresses && userAddresses.length > 0) locationDetermined = updateDefaultShippingLocation(userAddresses);
        }
        if (!locationDetermined && navigator.geolocation) {
            setIsGeolocating(true);
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
                        const data = await response.json();
                        if (data.address && data.address.postcode) {
                            setShippingLocation({ cep: data.address.postcode.replace(/\D/g, ''), city: data.address.city || '', state: data.address.state || '', alias: 'Localização Atual' });
                        }
                    } catch (error) { console.warn("Erro geo:", error); } 
                    finally { setIsGeolocating(false); }
                }, 
                () => setIsGeolocating(false), { timeout: 10000 }
            );
        }
    }, [isAuthenticated, fetchAddresses, updateDefaultShippingLocation]);

    useEffect(() => {
        if (!isAuthLoading) {
            if (cart.length > 0) localStorage.setItem('lovecestas_cart', JSON.stringify(cart));
            else if (cart.length === 0 && !isAuthenticated) localStorage.setItem('lovecestas_cart', JSON.stringify([]));
        }
    }, [cart, isAuthLoading, isAuthenticated]);

    useEffect(() => {
        if (isAuthLoading) return;
        const initializeShop = async () => {
            if (isAuthenticated) {
                await syncGuestCartToDB();
                await fetchPersistentCart();
                determineShippingLocation();
                apiService('/wishlist').then(setWishlist).catch(console.error);
                checkNotifications(); // Checa notificações ao iniciar
            } else {
                const localCart = localStorage.getItem('lovecestas_cart');
                if (localCart) { try { const parsed = JSON.parse(localCart); if (Array.isArray(parsed)) setCart(parsed); } catch (e) { setCart([]); } }
                setWishlist([]); setAddresses([]); setShippingLocation({ cep: '', city: '', state: '', alias: '' }); setAutoCalculatedShipping(null); setCouponCode(''); setAppliedCoupon(null); setCouponMessage(''); determineShippingLocation(); setOrderNotificationCount(0);
            }
        };
        initializeShop();
    }, [isAuthenticated, isAuthLoading, fetchPersistentCart, determineShippingLocation, syncGuestCartToDB, checkNotifications]);
    
    useEffect(() => {
        if (cart.length > 0 && isAuthenticated) {
            const missingData = cart.some(item => !item.hasOwnProperty('category') || !item.hasOwnProperty('brand'));
            if (missingData) fetchPersistentCart();
        }
    }, [cart.length, isAuthenticated, fetchPersistentCart]);

    useEffect(() => {
        const itemsToCalculate = previewShippingItem && previewShippingItem.length > 0 ? previewShippingItem : cart;
        const debounceTimer = setTimeout(() => {
            if (itemsToCalculate && itemsToCalculate.length > 0 && shippingLocation.cep.replace(/\D/g, '').length === 8) {
                setIsLoadingShipping(true);
                setShippingError('');
                
                const calculateShipping = async () => {
                    try {
                        const cleanCep = shippingLocation.cep.replace(/\D/g, '');
                        const cepPrefix = parseInt(cleanCep.substring(0, 5));
                        const isJoaoPessoa = cepPrefix >= 58000 && cepPrefix <= 58099;

                        const pickupOption = { name: "Retirar na loja", price: 0, delivery_time: 'Disponível para retirada', isPickup: true };
                        let finalOptions = [];

                        if (isJoaoPessoa) {
                            const localPrice = calculateLocalDeliveryPrice(itemsToCalculate);
                            const date = calculateDeliveryDate(1);
                            const formattedDate = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
                            const deliveryString = `Receba até ${formattedDate}`;

                            const localDeliveryOption = { name: "Entrega local (Motoboy / Uber)", price: localPrice, delivery_time: deliveryString, isLocal: true };
                            finalOptions = [localDeliveryOption, pickupOption];
                        } else {
                            const productsPayload = itemsToCalculate.map(item => ({ id: String(item.id), price: item.is_on_sale && item.sale_price ? item.sale_price : item.price, quantity: item.qty || 1 }));
                            const apiOptions = await apiService('/shipping/calculate', 'POST', { cep_destino: shippingLocation.cep, products: productsPayload });
                            const pacOptionRaw = apiOptions.find(opt => opt.name.toLowerCase().includes('pac'));
                            if (pacOptionRaw) finalOptions.push({ ...pacOptionRaw, name: 'PAC' });
                            finalOptions.push(pickupOption);
                        }

                        setShippingOptions(finalOptions);
                        const desiredOption = finalOptions.find(opt => opt.name === selectedShippingName);
                        setAutoCalculatedShipping(desiredOption || finalOptions[0] || null);

                    } catch (error) {
                        setShippingError(error.message || 'Não foi possível calcular o frete.');
                        const pickupOption = { name: "Retirar na loja", price: 0, delivery_time: 'Disponível para retirada', isPickup: true };
                        setShippingOptions([pickupOption]);
                        setAutoCalculatedShipping(pickupOption);
                    } finally { setIsLoadingShipping(false); }
                };
                calculateShipping();
            } else {
                setShippingOptions([]); setAutoCalculatedShipping(null);
            }
        }, 500);
        return () => clearTimeout(debounceTimer);
    }, [cart, shippingLocation, previewShippingItem, selectedShippingName, calculateLocalDeliveryPrice, calculateDeliveryDate]);

    // ... (restante das funções addToCart, removeFromCart, etc. - inalteradas)
    const addToCart = useCallback(async (productToAdd, qty = 1, variation = null) => {
        setPreviewShippingItem(null);
        const cartItemId = productToAdd.product_type === 'clothing' && variation ? `${productToAdd.id}-${variation.color}-${variation.size}` : productToAdd.id;
        const existing = cart.find(item => item.cartItemId === cartItemId);
        const availableStock = variation ? variation.stock : productToAdd.stock;
        const currentQtyInCart = existing ? existing.qty : 0;
        if (currentQtyInCart + qty > availableStock) throw new Error(`Estoque insuficiente. Apenas ${availableStock} unid.`);
        setCart(currentCart => {
            if (existing) return currentCart.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty + qty } : item);
            return [...currentCart, { ...productToAdd, qty, variation, cartItemId }];
        });
        if (isAuthenticated) {
            apiService('/cart', 'POST', { productId: productToAdd.id, quantity: existing ? existing.qty + qty : qty, variationId: variation?.id, variation: variation, variation_details: variation ? JSON.stringify(variation) : null }).catch(console.error);
        }
    }, [cart, isAuthenticated]);

    const removeFromCart = useCallback(async (cartItemId) => {
        const itemToRemove = cart.find(item => item.cartItemId === cartItemId);
        if (!itemToRemove) return;
        setCart(current => current.filter(item => item.cartItemId !== cartItemId));
        if (isAuthenticated) await apiService(`/cart/${itemToRemove.id}`, 'DELETE', { variation: itemToRemove.variation });
    }, [cart, isAuthenticated]);

    const updateQuantity = useCallback(async (cartItemId, newQuantity) => {
        if (newQuantity < 1) { removeFromCart(cartItemId); return; }
        const itemToUpdate = cart.find(item => item.cartItemId === cartItemId);
        if (!itemToUpdate) return;
        const availableStock = itemToUpdate.variation ? itemToUpdate.variation.stock : itemToUpdate.stock;
        if (newQuantity > availableStock) throw new Error(`Estoque insuficiente.`);
        setCart(current => current.map(item => item.cartItemId === cartItemId ? {...item, qty: newQuantity } : item));
        if (isAuthenticated) apiService('/cart', 'POST', { productId: itemToUpdate.id, quantity: newQuantity, variationId: itemToUpdate.variation?.id, variation: itemToUpdate.variation });
    }, [cart, isAuthenticated, removeFromCart]);

    const clearCart = useCallback(async () => { setCart([]); localStorage.removeItem('lovecestas_cart'); if (isAuthenticated) await apiService('/cart', 'DELETE'); }, [isAuthenticated]);
    const addToWishlist = useCallback(async (productToAdd) => { if (!isAuthenticated) return; if (wishlist.some(p => p.id === productToAdd.id)) return; try { const addedProduct = await apiService('/wishlist', 'POST', { productId: productToAdd.id }); setWishlist(current => [...current, addedProduct]); return { success: true, message: `${productToAdd.name} adicionado à lista!` }; } catch (error) { return { success: false, message: `Erro: ${error.message}` }; } }, [isAuthenticated, wishlist]);
    const removeFromWishlist = useCallback(async (productId) => { if (!isAuthenticated) return; try { await apiService(`/wishlist/${productId}`, 'DELETE'); setWishlist(current => current.filter(p => p.id !== productId)); } catch (error) { console.error(error); } }, [isAuthenticated]);
    const removeCoupon = useCallback(() => { setAppliedCoupon(null); setCouponCode(''); setCouponMessage(''); }, []);
    
    const applyCoupon = useCallback(async (code) => {
        setCouponCode(code); setCouponMessage(""); 
        try {
            const response = await apiService('/coupons/validate', 'POST', { code });
            const coupon = response.coupon;
            if (coupon.type !== 'free_shipping') {
                const rawAllowedCats = safeParse(coupon.allowed_categories);
                const rawAllowedBrands = safeParse(coupon.allowed_brands);
                const safeAllowedCats = rawAllowedCats.map(normalize).filter(s => s.length > 0);
                const safeAllowedBrands = rawAllowedBrands.map(normalize).filter(s => s.length > 0);
                const hasRestrictions = safeAllowedCats.length > 0 || safeAllowedBrands.length > 0;
                const isGlobal = !hasRestrictions;
                let eligibleCount = 0;
                if (isGlobal) eligibleCount = cart.length;
                else {
                    cart.forEach(item => {
                        const itemCat = normalize(item.category || "");
                        const itemBrand = normalize(item.brand || "");
                        const catMatch = safeAllowedCats.some(allowed => itemCat === allowed || itemCat.includes(allowed));
                        const brandMatch = safeAllowedBrands.some(allowed => itemBrand === allowed || itemBrand.includes(allowed));
                        if (catMatch || brandMatch) eligibleCount++;
                    });
                }
                if (eligibleCount === 0) { setAppliedCoupon(null); setCouponMessage("Nenhum produto elegível."); return; }
            }
            setAppliedCoupon(coupon);
        } catch (error) { setAppliedCoupon(null); setCouponMessage(error.message || "Erro no cupom."); }
    }, [cart]);

    const discount = useMemo(() => {
        if (!appliedCoupon) return 0;
        if (appliedCoupon.type === 'free_shipping') return autoCalculatedShipping ? autoCalculatedShipping.price : 0;
        let eligibleTotal = 0;
        const rawAllowedCats = safeParse(appliedCoupon.allowed_categories);
        const rawAllowedBrands = safeParse(appliedCoupon.allowed_brands);
        const safeAllowedCats = rawAllowedCats.map(normalize).filter(s => s.length > 0);
        const safeAllowedBrands = rawAllowedBrands.map(normalize).filter(s => s.length > 0);
        const hasRestrictions = safeAllowedCats.length > 0 || safeAllowedBrands.length > 0;
        const isGlobal = !hasRestrictions;

        cart.forEach(item => {
            let isEligible = false;
            if (isGlobal) isEligible = true;
            else {
                const itemCat = normalize(item.category || "");
                const itemBrand = normalize(item.brand || "");
                const catMatch = safeAllowedCats.some(allowed => itemCat === allowed || itemCat.includes(allowed));
                const brandMatch = safeAllowedBrands.some(allowed => itemBrand === allowed || itemBrand.includes(allowed));
                if (catMatch || brandMatch) isEligible = true;
            }
            if (isEligible) {
                const price = (item.is_on_sale && item.sale_price) ? parseFloat(item.sale_price) : parseFloat(item.price);
                eligibleTotal += price * item.qty;
            }
        });
        if (eligibleTotal === 0) return 0;
        let finalDiscount = 0;
        if (appliedCoupon.type === 'percentage') finalDiscount = eligibleTotal * (parseFloat(appliedCoupon.value) / 100);
        else if (appliedCoupon.type === 'fixed') finalDiscount = Math.min(parseFloat(appliedCoupon.value), eligibleTotal);
        return Math.min(finalDiscount, eligibleTotal);
    }, [appliedCoupon, cart, autoCalculatedShipping]);

    const clearOrderState = useCallback(() => { clearCart(); removeCoupon(); determineShippingLocation(); }, [clearCart, removeCoupon, determineShippingLocation]);

    return (
        <ShopContext.Provider value={{
            cart, setCart, clearOrderState, wishlist, addToCart, addToWishlist, removeFromWishlist, updateQuantity, removeFromCart, 
            userName: user?.name, addresses, fetchAddresses, shippingLocation, setShippingLocation, 
            autoCalculatedShipping, setAutoCalculatedShipping, shippingOptions, isLoadingShipping, shippingError, 
            updateDefaultShippingLocation, determineShippingLocation, setPreviewShippingItem, setSelectedShippingName, isGeolocating, 
            couponCode, setCouponCode, couponMessage, applyCoupon, appliedCoupon, removeCoupon, discount,
            calculateLocalDeliveryPrice, calculateDeliveryDate,
            orderNotificationCount, markOrderAsSeen, checkNotifications // EXPOSTO
        }}>
            {children}
        </ShopContext.Provider>
    );
};
const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const remove = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const show = useCallback((message, type = 'success', duration = 5000) => {
        const id = Date.now() + Math.random();
        setNotifications(prev => [...prev, { id, message, type }]);
        
        if (duration > 0) {
            setTimeout(() => {
                remove(id);
            }, duration);
        }
    }, [remove]);

    return (
        <NotificationContext.Provider value={{ show }}>
            {children}
            <div className="fixed bottom-5 right-5 z-[100] space-y-3">
                <AnimatePresence>
                    {notifications.map(n => 
                        <ToastMessage 
                            key={n.id} 
                            message={n.message} 
                            type={n.type}
                            onClose={() => remove(n.id)}
                        />
                    )}
                </AnimatePresence>
            </div>
        </NotificationContext.Provider>
    );
};

const ToastMessage = ({ message, type, onClose }) => {
    const typeClasses = {
        success: 'bg-green-500',
        error: 'bg-red-500',
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`pl-6 pr-10 py-4 rounded-lg shadow-xl text-white font-semibold flex items-center space-x-3 relative ${typeClasses[type]}`}
        >
            {type === 'success' ? <CheckCircleIcon className="h-6 w-6 flex-shrink-0"/> : <ExclamationIcon className="h-6 w-6 flex-shrink-0"/>}
            <span>{message}</span>
            <button 
                onClick={onClose} 
                className="absolute top-1/2 right-2 transform -translate-y-1/2 text-white/70 hover:text-white p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-white/50"
            >
                <CloseIcon className="h-5 w-5"/>
            </button>
        </motion.div>
    );
};

const ConfirmationProvider = ({ children }) => {
    const { user } = useAuth();
    const [confirmationState, setConfirmationState] = useState({ isOpen: false });
    const [verificationInput, setVerificationInput] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationError, setVerificationError] = useState('');

    const close = () => {
        setConfirmationState({ isOpen: false });
        setVerificationInput('');
        setVerificationError('');
        setIsVerifying(false);
    };

    const handleConfirm = async () => {
        const { onConfirm, requiresAuth } = confirmationState;

        if (requiresAuth) {
            setIsVerifying(true);
            setVerificationError('');
            try {
                const payload = user.is_two_factor_enabled 
                    ? { token: verificationInput } 
                    : { password: verificationInput };
                
                await apiService('/auth/verify-action', 'POST', payload);
                
                onConfirm();
                close();
            } catch (error) {
                setVerificationError(error.message || "Falha na verificação.");
            } finally {
                setIsVerifying(false);
            }
        } else {
            onConfirm();
            close();
        }
    };
    
    const show = useCallback((message, onConfirm, options = {}) => {
        setConfirmationState({
            isOpen: true,
            message,
            onConfirm,
            onCancel: close,
            requiresAuth: options.requiresAuth || false,
            confirmText: options.confirmText || 'Confirmar',
            confirmColor: options.confirmColor || 'bg-red-600 hover:bg-red-700',
        });
    }, []);

    const is2fa = user?.role === 'admin' && user?.is_two_factor_enabled;

    return (
        <ConfirmationContext.Provider value={{ show }}>
            {children}
            <AnimatePresence>
                {confirmationState.isOpen && (
                    <Modal isOpen={true} onClose={confirmationState.onCancel} title="Confirmação">
                        <p className="text-gray-700 mb-6">{confirmationState.message}</p>
                        
                        {confirmationState.requiresAuth && (
                            <div className="space-y-3 my-4 p-4 bg-gray-100 rounded-md border">
                                <label className="block text-sm font-medium text-gray-700">
                                    {is2fa ? "Código de Autenticação (2FA)" : "Confirme sua Senha"}
                                </label>
                                <input 
                                    type={is2fa ? "text" : "password"}
                                    value={verificationInput}
                                    onChange={(e) => setVerificationInput(e.target.value)}
                                    maxLength={is2fa ? 6 : undefined}
                                    placeholder={is2fa ? "123456" : "••••••••"}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                                {verificationError && <p className="text-red-500 text-sm mt-1">{verificationError}</p>}
                            </div>
                        )}

                        <div className="flex justify-end space-x-4">
                            <button onClick={confirmationState.onCancel} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
                            <button 
                                onClick={handleConfirm} 
                                disabled={isVerifying}
                                className={`px-4 py-2 text-white rounded-md flex items-center justify-center disabled:opacity-50 ${confirmationState.confirmColor}`}
                            >
                                {isVerifying ? <SpinnerIcon /> : confirmationState.confirmText}
                            </button>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </ConfirmationContext.Provider>
    );
};


// --- COMPONENTES DA UI ---
const Modal = memo(({ isOpen, onClose, title, children, size = 'lg' }) => {
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
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" 
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      onClick={onClose}
    >
      <motion.div 
        className={`bg-white rounded-lg shadow-xl w-full flex flex-col ${sizeClasses[size]}`} 
        style={{ maxHeight: '90vh' }} 
        variants={modalVariants}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-shrink-0 p-6 pb-4 flex justify-between items-center border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            <button onClick={onClose} className="text-3xl text-gray-400 hover:text-gray-600 leading-none">&times;</button>
        </div>
        <div className="flex-grow p-6 overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
});

const TrackingModal = memo(({ isOpen, onClose, order }) => {
    const [trackingInfo, setTrackingInfo] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const isPickupOrder = order?.shipping_method === 'Retirar na loja';

    useEffect(() => {
        if (isOpen && order && !isPickupOrder && order.tracking_code) {
            const fetchTracking = async () => {
                setIsLoading(true);
                setError('');
                setTrackingInfo([]);
                try {
                    const data = await apiService(`/track/${order.tracking_code}`);
                    setTrackingInfo(data);
                } catch (err) {
                    setError(err.message || "Não foi possível obter informações de rastreio.");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchTracking();
        }
    }, [isOpen, order, isPickupOrder]);

    const renderPickupStatus = () => {
        let statusMessage;
        switch (order.status) {
            case 'Pronto para Retirada':
                statusMessage = (
                    <p className="flex items-center gap-2 text-green-700 font-semibold"><CheckCircleIcon className="h-5 w-5"/> Seu pedido já está separado e pronto para ser retirado!</p>
                );
                break;
            case 'Entregue':
                statusMessage = (
                    <p className="flex items-center gap-2 text-green-700 font-semibold"><CheckBadgeIcon className="h-5 w-5"/> Este pedido já foi retirado.</p>
                );
                break;
            case 'Reembolsado':
                statusMessage = (
                    <p className="flex items-center gap-2 text-gray-700 font-semibold"><CurrencyDollarIcon className="h-5 w-5"/> O pagamento para este pedido foi reembolsado.</p>
                );
                break;
            case 'Cancelado':
            case 'Pagamento Recusado':
                 statusMessage = (
                    <p className="flex items-center gap-2 text-red-700 font-semibold"><XCircleIcon className="h-5 w-5"/> Este pedido foi cancelado.</p>
                );
                break;
            default: // Pendente, Pagamento Aprovado, Separando Pedido
                statusMessage = (
                    <p className="flex items-center gap-2 text-amber-700 font-semibold"><ClockIcon className="h-5 w-5"/> Estamos preparando seu pedido. Você será notificado assim que estiver pronto.</p>
                );
        }

        return (
            <div className="space-y-6 text-gray-800">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Status Atual: <span className="text-blue-600">{order.status}</span></h3>
                    <div className="p-4 bg-gray-100 rounded-lg border">
                        {statusMessage}
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-gray-900 mb-2">Instruções para Retirada</h3>
                    <div className="text-sm bg-gray-100 p-4 rounded-lg border space-y-3">
                        <p><strong>Endereço:</strong><br/> R. Leopoldo Pereira Lima, 378 – Mangabeira VIII, João Pessoa – PB, 58059-123</p>
                        <p><strong>Horário:</strong><br/> Segunda a Sábado, das 9h às 11h30 e das 15h às 17h30 (exceto feriados).</p>
                        <p className="font-semibold pt-2 border-t">No momento da retirada, é necessário apresentar:</p>
                        <ul className="list-disc list-inside">
                            <li>Documento com foto (RG ou CNH)</li>
                            <li>O número do pedido: <span className="font-bold">#{order.id}</span></li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    };

    const renderShippingTracking = () => (
        <>
            {isLoading && <p>Buscando informações...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!isLoading && !error && trackingInfo.length > 0 && (
                <div className="space-y-6">
                    {trackingInfo.map((event, index) => (
                        <div key={index} className="flex space-x-4">
                            <div className="flex flex-col items-center">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${index === 0 ? 'bg-amber-500' : 'bg-gray-300'}`}>
                                    {index === 0 && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                </div>
                                {index < trackingInfo.length - 1 && <div className="w-px h-full bg-gray-300"></div>}
                            </div>
                            <div>
                                <p className="font-bold text-gray-800">{event.status}</p>
                                <p className="text-sm text-gray-600">{event.location}</p>
                                <p className="text-xs text-gray-400">{new Date(event.date).toLocaleString('pt-BR')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
             {!isLoading && !error && trackingInfo.length === 0 && (
                <p>Nenhuma informação de rastreio disponível no momento.</p>
            )}
        </>
    );

    return (
        <AnimatePresence>
            {isOpen && order && (
                <Modal 
                    isOpen={isOpen} 
                    onClose={onClose} 
                    title={isPickupOrder ? `Status da Retirada: Pedido #${order.id}` : `Rastreio do Pedido: ${order.tracking_code}`}
                >
                    {isPickupOrder ? renderPickupStatus() : renderShippingTracking()}
                </Modal>
            )}
        </AnimatePresence>
    );
});

// --- COMPONENTE DO BOTÃO DE VOLTAR AO TOPO ---
const BackToTopButton = ({ scrollableRef }) => {
    const [isVisible, setIsVisible] = useState(false);

    const toggleVisibility = useCallback(() => {
        const target = scrollableRef?.current;
        let scrollTop = 0;
        if (target) {
            scrollTop = target.scrollTop; // Usa o scroll do elemento
        } else {
            scrollTop = window.pageYOffset; // Usa o scroll da página
        }

        if (scrollTop > 300) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [scrollableRef]);

    const scrollToTop = () => {
        const target = scrollableRef?.current;
        if (target) {
            target.scrollTo({ top: 0, behavior: 'smooth' }); // Rola o elemento
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola a página
        }
    };

    useEffect(() => {
        const target = scrollableRef?.current || window;
        
        // Garante que o target (elemento) exista antes de adicionar o listener
        if (target) {
            target.addEventListener('scroll', toggleVisibility);
            return () => {
                target.removeEventListener('scroll', toggleVisibility);
            };
        }
    }, [toggleVisibility, scrollableRef]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    onClick={scrollToTop}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed bottom-6 right-6 z-50 bg-amber-500 text-black p-3 rounded-full shadow-lg hover:bg-amber-400 transition-colors"
                    aria-label="Voltar ao topo"
                >
                    <ChevronUpIcon className="h-6 w-6" />
                </motion.button>
            )}
        </AnimatePresence>
    );
};

const ProductCard = memo(({ product, onNavigate }) => {
    const { addToCart, shippingLocation, calculateLocalDeliveryPrice } = useShop(); // Pega a função de cálculo do contexto
    const notification = useNotification();
    const { user } = useAuth();
    const { wishlist, addToWishlist, removeFromWishlist } = useShop(); 
    const { isAuthenticated } = useAuth();

    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [cardShippingInfo, setCardShippingInfo] = useState(null); 
    const [isCardShippingLoading, setIsCardShippingLoading] = useState(false); 
    
    const [timeLeft, setTimeLeft] = useState('');
    const [isPromoActive, setIsPromoActive] = useState(false);

    const imageUrl = useMemo(() => getFirstImage(product.images), [product.images]);

    useEffect(() => {
        setIsPromoActive(!!product.is_on_sale && product.sale_price > 0);
    }, [product]);

    const currentPrice = isPromoActive ? product.sale_price : product.price;

    const discountPercent = useMemo(() => {
        if (isPromoActive && product.price > 0) { 
            return Math.round(((product.price - product.sale_price) / product.price) * 100);
        }
        return 0;
    }, [isPromoActive, product]);

    useEffect(() => {
        if (!product?.sale_end_date) {
            setTimeLeft('');
            return;
        }

        if (!isPromoActive) return;

        const calculateTimeLeft = () => {
            const difference = new Date(product.sale_end_date) - new Date();
            
            if (difference > 0) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);

                let timeString = '';
                if (days > 0) timeString += `${days}d `;
                timeString += `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                setTimeLeft(timeString);
            } else {
                setTimeLeft('Expirada');
                setIsPromoActive(false);
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [isPromoActive, product.sale_end_date]);

    const isNew = useMemo(() => {
        if (!product || !product.created_at) return false;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return new Date(product.created_at) > thirtyDaysAgo;
    }, [product]);

    const avgRating = product.avg_rating ? Math.round(product.avg_rating) : 0;
    const reviewCount = product.review_count || 0;

    const productVariations = useMemo(() => parseJsonString(product?.variations, []), [product]);
    const isProductOutOfStock = product.stock <= 0;
    const isVariationOutOfStock = product.product_type === 'clothing' && productVariations.length > 0 && productVariations.every(v => v.stock <= 0);
    const isOutOfStock = isProductOutOfStock || isVariationOutOfStock;

    // --- Efeito de Frete Atualizado ---
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;
         const debounceTimer = setTimeout(() => {
            const cleanCep = shippingLocation.cep.replace(/\D/g, '');
            
            if (product && cleanCep.length === 8) {
                setIsCardShippingLoading(true);
                setCardShippingInfo(null);

                // --- LÓGICA LOCAL PARA JOÃO PESSOA ---
                const cepPrefix = parseInt(cleanCep.substring(0, 5));
                const isJoaoPessoa = cepPrefix >= 58000 && cepPrefix <= 58099;

                if (isJoaoPessoa) {
                    // Calcula data para 1 dia útil
                    const date = new Date();
                    let addedDays = 0;
                    while (addedDays < 1) { // 1 dia útil
                        date.setDate(date.getDate() + 1);
                        if (date.getDay() !== 0 && date.getDay() !== 6) { addedDays++; }
                    }
                    const formattedDate = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
                    
                    // USANDO O CÁLCULO DINÂMICO COM CORREÇÃO DE EXIBIÇÃO
                    const localPrice = calculateLocalDeliveryPrice ? calculateLocalDeliveryPrice([product]) : 20;
                    
                    const priceDisplay = localPrice === 0 ? "Grátis" : `R$ ${localPrice.toFixed(2).replace('.', ',')}`;
                    
                    setCardShippingInfo(`Frete ${priceDisplay} - Receba até ${formattedDate}.`);
                    setIsCardShippingLoading(false);
                    return; // Interrompe para não chamar a API
                }

                // --- LÓGICA PADRÃO PARA OUTROS CEPs (API) ---
                const calculateShipping = async () => {
                    try {
                        const productsPayload = [{ id: String(product.id), price: currentPrice, quantity: 1 }];
                        const apiOptions = await apiService('/shipping/calculate', 'POST', { cep_destino: shippingLocation.cep, products: productsPayload }, { signal });

                        let shippingOption = apiOptions.find(opt => opt.name.toLowerCase().includes('pac'));
                        if (!shippingOption) {
                            shippingOption = apiOptions.find(opt => opt.name.toLowerCase().includes('sedex'));
                        }

                        if (shippingOption) {
                            const date = new Date();
                            let deliveryTime = shippingOption.delivery_time;
                            let addedDays = 0;
                            while (addedDays < deliveryTime) {
                                date.setDate(date.getDate() + 1);
                                if (date.getDay() !== 0 && date.getDay() !== 6) { addedDays++; }
                            }
                            const formattedDate = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
                            setCardShippingInfo(`Frete R$ ${Number(shippingOption.price).toFixed(2).replace('.', ',')} - Receba até ${formattedDate}.`);
                        } else {
                            setCardShippingInfo('Entrega indisponível para este CEP.');
                        }
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            setCardShippingInfo('Erro ao calcular frete.');
                        }
                    } finally {
                        if (!signal.aborted) { setIsCardShippingLoading(false); }
                    }
                };
                calculateShipping();
            } else {
                setCardShippingInfo(null); 
                 setIsCardShippingLoading(false); 
            }
        }, 500);

        return () => {
            clearTimeout(debounceTimer);
            controller.abort();
        };
    }, [product, shippingLocation.cep, currentPrice, calculateLocalDeliveryPrice]); // Adicionado calculateLocalDeliveryPrice nas dependências

    const installmentInfo = useMemo(() => {
        if (currentPrice >= 100) {
            const installmentValue = currentPrice / 4;
            return `4x de R$ ${installmentValue.toFixed(2).replace('.', ',')} s/ juros`;
        }
        return null;
    }, [currentPrice]);

    const handleViewDetails = (e) => {
        e.stopPropagation();
        onNavigate(`product/${product.id}`);
    };

    const handleAddToCartInternal = async (e) => { 
        e.stopPropagation();
        if (product.product_type === 'clothing') {
            notification.show("Escolha cor e tamanho na página do produto.", "error");
            onNavigate(`product/${product.id}`);
            return;
        }
        setIsAddingToCart(true);
        try {
            await addToCart(product, 1);
            notification.show(`${product.name} adicionado ao carrinho!`);
        } catch (error) {
            notification.show(error.message || "Erro ao adicionar ao carrinho", "error");
        } finally {
            setIsAddingToCart(false);
        }
    };

    const WishlistButton = ({ product }) => {
        const isWishlisted = wishlist.some(item => item.id === product.id);
        const handleWishlistToggle = async (e) => {
            e.stopPropagation(); 
            if (!isAuthenticated) {
                notification.show("Faça login para adicionar à lista de desejos", "error");
                return;
            }
            if (isWishlisted) {
                await removeFromWishlist(product.id);
                notification.show(`${product.name} removido da lista de desejos.`, 'error');
            } else {
                const result = await addToWishlist(product);
                notification.show(result.message, result.success ? 'success' : 'error');
            }
        };
        return (
            <button
                onClick={handleWishlistToggle}
                className={`absolute top-2 right-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm p-1.5 rounded-full text-white transition-colors duration-200 z-10 ${isWishlisted ? 'text-amber-400' : 'hover:text-amber-300'}`}
                aria-label="Adicionar à Lista de Desejos"
            >
                <HeartIcon className="h-5 w-5" filled={isWishlisted} />
            </button>
        );
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <motion.div
            layout 
            variants={cardVariants}
            initial="hidden" 
            animate="visible" 
            exit="hidden" 
            whileHover={{ y: -5, boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)" }}
            className={`bg-black border ${isPromoActive ? (timeLeft && timeLeft !== 'Expirada' ? 'border-red-600 shadow-lg shadow-red-900/30' : 'border-green-600 shadow-lg shadow-green-900/30') : 'border-gray-800'} rounded-lg overflow-hidden flex flex-col text-white h-full transition-shadow duration-300 ${isOutOfStock ? 'opacity-60 grayscale-[50%]' : ''}`} 
            onClick={() => onNavigate(`product/${product.id}`)} 
        >
            <div className="relative h-64 bg-white overflow-hidden group">
                <img
                    src={imageUrl} 
                    alt={product.name}
                    loading="lazy" // <--- OTIMIZAÇÃO DE PERFORMANCE ADICIONADA AQUI
                    className="w-full h-full object-contain cursor-pointer transition-transform duration-300 group-hover:scale-105 p-2"
                />
                <WishlistButton product={product} /> 

                <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
                    {isOutOfStock ? (
                        <div className="bg-gray-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow">ESGOTADO</div>
                    ) : isPromoActive ? (
                         <div className={`bg-gradient-to-r ${timeLeft && timeLeft !== 'Expirada' ? 'from-red-600 to-orange-500' : 'from-green-600 to-teal-500'} text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5`}> 
                            <SaleIcon className="h-4 w-4"/>
                            <span>PROMOÇÃO {discountPercent}%</span>
                        </div>
                    ) : isNew ? (
                        <div className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">LANÇAMENTO</div> 
                    ) : null}
                </div>

                {isPromoActive && timeLeft && timeLeft !== 'Expirada' && !isOutOfStock && (
                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-r from-red-700 to-red-500/90 backdrop-blur-md py-1.5 px-3 flex items-center justify-between z-20 shadow-inner border-t border-red-400">
                        <div className="flex items-center gap-1.5 text-white font-bold text-[10px] uppercase tracking-wide">
                            <SparklesIcon className="h-3 w-3 text-yellow-300 animate-pulse"/>
                            <span>Oferta Relâmpago</span>
                        </div>
                        <div className="flex items-center gap-1 bg-black/30 rounded px-1.5 py-0.5">
                            <ClockIcon className="h-3 w-3 text-white"/>
                            <span className="text-white font-mono font-bold text-xs">{timeLeft}</span>
                        </div>
                    </div>
                )}

                {isPromoActive && (!timeLeft || timeLeft === 'Expirada') && !isOutOfStock && (
                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-r from-emerald-600 to-green-500/95 backdrop-blur-md py-1.5 px-3 flex items-center justify-between z-20 shadow-inner border-t border-emerald-400/50">
                        <div className="flex items-center gap-1.5 text-white font-bold text-[10px] uppercase tracking-wide">
                            <TagIcon className="h-3 w-3 text-white fill-white"/>
                            <span>Preço Especial</span>
                        </div>
                        <div className="flex items-center gap-1 bg-black/20 rounded px-2 py-0.5">
                            <span className="text-white font-bold text-[9px]">Aproveite</span>
                        </div>
                    </div>
                )}

                 {product.product_type === 'clothing' && !isPromoActive && !isOutOfStock && (
                    <div className="absolute bottom-0 left-0 w-full bg-black/70 text-center text-xs py-1 text-amber-300"> 
                        Ver Cores e Tamanhos
                    </div>
                 )}
                 {user && user.role === 'admin' && (
                    <div className="absolute top-2 right-10 z-10"> 
                        <button onClick={(e) => { e.stopPropagation(); onNavigate(`admin/products?search=${encodeURIComponent(product.name)}`); }}
                                className="bg-gray-700/50 hover:bg-gray-600/70 backdrop-blur-sm text-white p-1.5 rounded-full shadow-md transition-colors" 
                                title="Editar Produto">
                            <EditIcon className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            <div className="p-4 flex flex-col flex-grow">
                <div>
                    <p className="text-xs font-semibold text-amber-400 mb-1">{product.brand.toUpperCase()}</p>
                    <h4
                        className="text-base font-semibold tracking-tight cursor-pointer hover:text-amber-300 transition-colors line-clamp-2 h-10"
                        title={product.name}
                    >
                        {product.name}
                    </h4>
                    <div className="flex items-center mt-1.5 h-4 gap-1">
                        {[...Array(5)].map((_, i) => ( <StarIcon key={i} className={`h-4 w-4 ${i < avgRating ? 'text-amber-400' : 'text-gray-600'}`} isFilled={i < avgRating} /> ))}
                        {reviewCount > 0 && ( <span className="text-[10px] text-gray-500">({reviewCount})</span> )}
                    </div>
                </div>

                <div className="mt-auto pt-3">
                    {isPromoActive ? (
                         <div className="flex flex-col">
                            <p className="text-xs font-light text-gray-500 line-through">R$ {Number(product.price).toFixed(2).replace('.', ',')}</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-xl font-bold text-red-500">R$ {Number(product.sale_price).toFixed(2).replace('.', ',')}</p>
                                <span className={`text-xs font-bold ${timeLeft && timeLeft !== 'Expirada' ? 'text-red-500' : 'text-green-500'}`}>{discountPercent}% OFF</span>
                            </div>
                        </div>
                    ) : ( <p className="text-xl font-semibold text-white">R$ {Number(product.price).toFixed(2).replace('.', ',')}</p> )}

                    {installmentInfo && ( <p className="text-[11px] text-gray-400 mt-0.5">{installmentInfo}</p> )}

                    {isOutOfStock ? (
                        <div className="mt-3">
                            <div className="w-full bg-gray-700 text-gray-400 py-2 px-3 rounded-md font-bold text-center text-sm">Esgotado</div>
                        </div>
                    ) : (
                        <div className="mt-3 flex items-stretch space-x-2">
                            <button
                                onClick={handleViewDetails}
                                className="flex-grow bg-amber-400 text-black py-2 px-3 rounded-md hover:bg-amber-300 transition font-bold text-sm text-center flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                            >
                                <EyeIcon className="h-4 w-4"/>
                                Ver Detalhes
                            </button>
                            <button
                                onClick={handleAddToCartInternal}
                                disabled={isAddingToCart}
                                title="Adicionar ao Carrinho"
                                className="flex-shrink-0 border border-gray-600 text-gray-400 p-2 rounded-md hover:bg-gray-700 hover:text-white transition flex items-center justify-center disabled:opacity-50"
                            >
                                {isAddingToCart ? <SpinnerIcon className="h-5 w-5 text-gray-400" /> : <CartIcon className="h-5 w-5"/>}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {(isCardShippingLoading || cardShippingInfo) && (
                <div className="p-2 text-[10px] text-center border-t border-gray-800 bg-gray-900/50 flex items-center justify-center gap-1.5">
                    {isCardShippingLoading ? (
                        <SpinnerIcon className="h-3 w-3 text-gray-500" />
                    ) : cardShippingInfo.includes('Erro') ? (
                         <ExclamationCircleIcon className="h-3 w-3 text-red-500" />
                    ) : (
                        <TruckIcon className="h-3 w-3 text-green-500"/>
                    )}
                    <span className={isCardShippingLoading ? "text-gray-500" : (cardShippingInfo.includes('Erro') ? 'text-red-400' : 'text-gray-400')}>
                        {isCardShippingLoading ? 'Calculando...' : cardShippingInfo}
                    </span>
                </div>
            )}
        </motion.div>
    );
});

const ProductCarousel = memo(({ products, onNavigate, title }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(4);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const minSwipeDistance = 50;

    const updateItemsPerPage = useCallback(() => {
        if (window.innerWidth < 640) setItemsPerPage(1);
        else if (window.innerWidth < 1024) setItemsPerPage(2);
        else setItemsPerPage(4);
    }, []);

    useEffect(() => {
        updateItemsPerPage();
        window.addEventListener('resize', updateItemsPerPage);
        return () => window.removeEventListener('resize', updateItemsPerPage);
    }, [updateItemsPerPage]);

    useEffect(() => {
        const maxIndex = Math.max(0, products.length - itemsPerPage);
        if (currentIndex > maxIndex) {
            setCurrentIndex(maxIndex);
        }
    }, [itemsPerPage, products, currentIndex]);

    const goNext = useCallback(() => {
        const maxIndex = Math.max(0, products.length - itemsPerPage);
        setCurrentIndex(prev => Math.min(prev + 1, maxIndex));
    }, [products.length, itemsPerPage]);

    const goPrev = useCallback(() => {
        setCurrentIndex(prev => Math.max(prev - 1, 0));
    }, []);

    if (!products || products.length === 0) {
        return null;
    }

    const canGoPrev = currentIndex > 0;
    const canGoNext = products.length > itemsPerPage && currentIndex < (products.length - itemsPerPage);

    const handleTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && canGoNext) {
            goNext();
        } else if (isRightSwipe && canGoPrev) {
            goPrev();
        }

        setTouchStart(null);
        setTouchEnd(null);
    };

    return (
        <div className="relative">
            {title && <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">{title}</h2>}
            <div
                className="overflow-hidden cursor-grab active:cursor-grabbing"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <motion.div
                    className="flex -mx-2 md:-mx-4" // Mantém align-items: stretch (padrão)
                    animate={{ x: `-${currentIndex * (100 / itemsPerPage)}%` }}
                    transition={{ type: 'spring', stiffness: 350, damping: 40 }}
                >
                    {products.map(product => (
                        <div
                            key={product.id}
                            className="flex-shrink-0 px-2 md:px-4" // REMOVIDO self-start
                            style={{ width: `${100 / itemsPerPage}%` }}
                        >
                            <ProductCard product={product} onNavigate={onNavigate} />
                        </div>
                    ))}
                </motion.div>
            </div>

            {products.length > itemsPerPage && (
                <>
                    <button onClick={goPrev} disabled={!canGoPrev} className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-2 md:-translate-x-4 bg-white/50 hover:bg-white text-black p-2 rounded-full shadow-lg disabled:opacity-30 disabled:cursor-not-allowed z-10 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={goNext} disabled={!canGoNext} className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-2 md:translate-x-4 bg-white/50 hover:bg-white text-black p-2 rounded-full shadow-lg disabled:opacity-30 disabled:cursor-not-allowed z-10 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </>
            )}
        </div>
    );
});


const Header = memo(({ onNavigate }) => {
    const { isAuthenticated, user, logout } = useAuth();
    const { cart, wishlist, addresses, shippingLocation, setShippingLocation, fetchAddresses, orderNotificationCount } = useShop(); // Garanta que orderNotificationCount está aqui
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [activeMenu, setActiveMenu] = useState(null);
    const [mobileAccordion, setMobileAccordion] = useState(null);
    const [dynamicMenuItems, setDynamicMenuItems] = useState([]);
    const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || 'home');

    // Estado para visibilidade da BottomNavBar
    const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);
    const lastScrollY = useRef(0);
    const isScrollingDown = useRef(false);

    useEffect(() => {
        const handleHashChange = () => {
             setCurrentPath(window.location.hash.slice(1) || 'home');
        };
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();
        return () => window.removeEventListener('hashchange', handleHashChange);
     }, []);

    useEffect(() => {
        const isIOS = () => {
            return [
                'iPad Simulator',
                'iPhone Simulator',
                'iPod Simulator',
                'iPad',
                'iPhone',
                'iPod'
            ].includes(navigator.platform)
            || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
        }

        const controlNavbar = () => {
            if (!isIOS()) {
                 setIsBottomNavVisible(true);
                 isScrollingDown.current = false;
                 lastScrollY.current = window.scrollY;
                 return;
            }

            const currentScrollY = window.scrollY;
            const threshold = 5;

            if (window.innerWidth < 768) {
                if (currentScrollY > lastScrollY.current + threshold && !isScrollingDown.current) {
                    setIsBottomNavVisible(false);
                    isScrollingDown.current = true;
                } else if (currentScrollY < lastScrollY.current - threshold && isScrollingDown.current) {
                    setIsBottomNavVisible(true);
                    isScrollingDown.current = false;
                }
            } else {
                setIsBottomNavVisible(true);
                isScrollingDown.current = false;
            }

            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', controlNavbar);
        return () => {
            window.removeEventListener('scroll', controlNavbar);
        };
    }, []);

    const fetchAndBuildMenu = useCallback(() => {
        apiService('/collections')
            .then(data => {
                const groupedMenu = data.reduce((acc, category) => {
                    const section = category.menu_section;
                    if (!acc[section]) {
                        acc[section] = [];
                    }
                    acc[section].push({ name: category.name, filter: category.filter });
                    return acc;
                }, {});

                const menuOrder = ['Perfumaria', 'Roupas', 'Conjuntos', 'Moda Íntima', 'Calçados', 'Acessórios'];
                const finalMenuStructure = menuOrder
                    .filter(sectionName => groupedMenu[sectionName])
                    .map(sectionName => ({
                        name: sectionName,
                        sub: groupedMenu[sectionName]
                    }));
                setDynamicMenuItems(finalMenuStructure);
            })
            .catch(err => {
                console.error("Falha ao construir o menu dinâmico:", err);
                setDynamicMenuItems([]);
            });
    }, []);

    useEffect(() => {
        fetchAndBuildMenu();
    }, [fetchAndBuildMenu]);

    useEffect(() => {
        if (isMobileMenuOpen && dynamicMenuItems.length === 0) {
            fetchAndBuildMenu();
        }
    }, [isMobileMenuOpen, dynamicMenuItems, fetchAndBuildMenu]);

    const totalCartItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const prevTotalCartItems = useRef(totalCartItems);
    const cartAnimationControls = useAnimation();

    useEffect(() => {
        if (totalCartItems > prevTotalCartItems.current) {
            cartAnimationControls.start({
                scale: [1, 1.25, 0.9, 1.1, 1],
                transition: { duration: 0.5, times: [0, 0.25, 0.5, 0.75, 1] }
            });
        }
        prevTotalCartItems.current = totalCartItems;
    }, [totalCartItems, cartAnimationControls]);

    useEffect(() => {
        if (searchTerm.length < 1) {
            setSearchSuggestions([]);
            return;
        }
        const debounceTimer = setTimeout(() => {
            apiService(`/products/search-suggestions?q=${searchTerm}`)
                .then(data => setSearchSuggestions(data))
                .catch(err => console.error(err));
        }, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchTerm]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            onNavigate(`products?search=${encodeURIComponent(searchTerm.trim())}`);
            setSearchTerm('');
            setSearchSuggestions([]);
            setIsMobileMenuOpen(false);
        }
    };

    const handleSuggestionClick = (productId) => {
        onNavigate(`product/${productId}`);
        setSearchTerm('');
        setSearchSuggestions([]);
        setIsSearchFocused(false);
        setIsMobileMenuOpen(false);
    };

    const dropdownVariants = {
        open: { opacity: 1, y: 0, display: 'block', transition: { duration: 0.2 } },
        closed: { opacity: 0, y: -20, transition: { duration: 0.2 }, transitionEnd: { display: 'none' } }
    };

    const mobileMenuVariants = {
        open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
        closed: { x: "-100%", transition: { type: 'spring', stiffness: 300, damping: 30 } },
    };

    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [manualCep, setManualCep] = useState('');
    const [cepError, setCepError] = useState('');

    useEffect(() => {
        if (isAddressModalOpen && isAuthenticated) {
            fetchAddresses();
        }
    }, [isAddressModalOpen, isAuthenticated, fetchAddresses]);

    const handleSelectAddress = (addr) => {
        setShippingLocation({ cep: addr.cep, city: addr.localidade, state: addr.uf, alias: addr.alias });
        setIsAddressModalOpen(false);
    };

    const handleManualCepSubmit = async (e) => {
        e.preventDefault();
        setCepError('');
        const cleanCep = manualCep.replace(/\D/g, '');
        if (cleanCep.length !== 8) { setCepError("CEP inválido."); return; }
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();
            if (data.erro) { setCepError("CEP não encontrado."); } else {
                setShippingLocation({ cep: manualCep, city: data.localidade, state: data.uf, alias: `CEP ${manualCep}` });
                setIsAddressModalOpen(false);
                setManualCep('');
            }
        } catch { setCepError("Não foi possível buscar o CEP."); }
    };

    const handleCepInputChange = (e) => {
        setManualCep(maskCEP(e.target.value));
        if (cepError) setCepError('');
    };

    let addressDisplay = 'Selecione um endereço';
    if (shippingLocation && shippingLocation.cep) {
        const cleanCep = shippingLocation.cep.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            const formattedCep = cleanCep.replace(/(\d{5})(\d{3})/, '$1-$2');
            const displayCityState = [shippingLocation.city, shippingLocation.state].filter(Boolean).join(' - ');
            let prefix = 'Enviar para';

            if (shippingLocation.alias && !shippingLocation.alias.startsWith('CEP ') && shippingLocation.alias !== 'Localização Atual') {
                prefix = `Enviar para ${shippingLocation.alias} -`;
            } else if (isAuthenticated && user?.name) {
                prefix = `Enviar para ${user.name.split(' ')[0]} -`;
            }

            if (displayCityState) {
                addressDisplay = `${prefix} ${displayCityState} ${formattedCep}`;
            } else {
                 addressDisplay = `${prefix} ${formattedCep}`;
            }
        }
    }

    const BottomNavBar = () => {
        const wishlistCount = wishlist.length;

        const navVariants = {
            visible: { y: 0, transition: { type: "tween", duration: 0.3, ease: "easeOut" } },
            hidden: { y: "100%", transition: { type: "tween", duration: 0.3, ease: "easeIn" } }
        };

        return (
            <motion.div
                className="fixed bottom-0 left-0 right-0 h-16 bg-black border-t border-gray-800 flex justify-around items-center z-50 md:hidden pb-safe"
                initial={false}
                animate={isBottomNavVisible ? "visible" : "hidden"}
                variants={navVariants}
            >
                <button onClick={() => onNavigate('home')} className={`flex flex-col items-center justify-center transition-colors w-1/5 ${currentPath === 'home' || currentPath === '' ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'}`}>
                    <HomeIcon className="h-6 w-6 mb-1"/>
                    <span className="text-[10px]">Início</span>
                </button>
                
                <button onClick={() => onNavigate('wishlist')} className={`relative flex flex-col items-center justify-center transition-colors w-1/5 ${currentPath === 'wishlist' ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'}`}>
                    <HeartIcon className="h-6 w-6 mb-1"/>
                    <span className="text-[10px]">Lista</span>
                    {wishlistCount > 0 && <span className="absolute top-0 right-[25%] bg-amber-400 text-black text-[9px] rounded-full h-4 w-4 flex items-center justify-center font-bold">{wishlistCount}</span>}
                </button>

                <button onClick={() => onNavigate('cart')} className={`relative flex flex-col items-center justify-center transition-colors w-1/5 ${currentPath === 'cart' ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'}`}>
                    <motion.div animate={cartAnimationControls}>
                        <CartIcon className="h-6 w-6 mb-1"/>
                    </motion.div>
                    <span className="text-[10px]">Carrinho</span>
                    {totalCartItems > 0 && <span className="absolute top-0 right-[25%] bg-amber-400 text-black text-[9px] rounded-full h-4 w-4 flex items-center justify-center font-bold">{totalCartItems}</span>}
                </button>
                
                <button onClick={() => isAuthenticated ? onNavigate('account') : onNavigate('login')} className={`flex flex-col items-center justify-center transition-colors w-1/5 ${currentPath.startsWith('account') || currentPath === 'login' ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'}`}>
                    <UserIcon className="h-6 w-6 mb-1"/>
                    <span className="text-[10px]">Conta</span>
                </button>

                <button onClick={() => onNavigate('categories')} className={`relative flex flex-col items-center justify-center transition-colors w-1/5 ${currentPath === 'categories' ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'}`}>
                    <div className="relative">
                        <BarsGripIcon className="h-6 w-6 mb-1"/>
                         {/* --- NOTIFICAÇÃO NO MENU PRINCIPAL MOBILE --- */}
                        {isAuthenticated && orderNotificationCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-600 rounded-full border-2 border-black animate-pulse"></span>
                        )}
                    </div>
                    <span className="text-[10px]">Menu</span>
                </button>
            </motion.div>
        );
    };

    return (
        <>
        <AnimatePresence>
            {isAddressModalOpen && (
                <Modal isOpen={true} onClose={() => setIsAddressModalOpen(false)} title="Selecionar Endereço de Entrega" size="md">
                    <div className="space-y-4">
                        {isAuthenticated && addresses && addresses.length > 0 && addresses.map(addr => (
                             <div key={addr.id} onClick={() => handleSelectAddress(addr)} className="p-4 border-2 rounded-lg cursor-pointer transition-all bg-gray-50 hover:border-amber-400 hover:bg-amber-50">
                                 <p className="font-bold text-gray-800">{addr.alias} {addr.is_default ? <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full ml-2">Padrão</span> : ''}</p>
                                 <p className="text-sm text-gray-600">{addr.logradouro}, {addr.numero} - {addr.bairro}</p>
                                 <p className="text-sm text-gray-500">{addr.localidade} - {addr.uf}</p>
                             </div>
                        ))}
                         {isAuthenticated && addresses.length === 0 && (
                            <p className="text-sm text-center text-gray-500 py-4">Nenhum endereço cadastrado...</p>
                         )}
                         {!isAuthenticated && (
                            <p className="text-sm text-center text-gray-500 py-4">Faça login para usar seus endereços...</p>
                         )}
                        <div className="pt-4 border-t">
                            <form onSubmit={handleManualCepSubmit} className="space-y-2">
                                 <label className="block text-sm font-medium text-gray-700">Calcular frete para um CEP</label>
                                 <div className="flex gap-2">
                                    <input type="text" value={manualCep} onChange={handleCepInputChange} placeholder="00000-000" className="w-full p-2 border border-gray-300 rounded-md text-gray-900" />
                                    <button type="submit" className="bg-gray-800 text-white font-bold px-4 rounded-md hover:bg-black">OK</button>
                                 </div>
                                 {cepError && <p className="text-red-500 text-xs mt-1">{cepError}</p>}
                            </form>
                        </div>
                    </div>
                </Modal>
            )}
        </AnimatePresence>

        <header className="bg-black/80 backdrop-blur-md text-white shadow-lg sticky top-0 z-40">
            {/* Top Bar - Desktop */}
            <div className="hidden md:block px-4 sm:px-6">
                <div className="flex justify-between items-center py-3">
                    <a href="#home" onClick={(e) => { e.preventDefault(); onNavigate('home'); }} className="flex items-center gap-2 text-xl font-bold tracking-wide text-amber-400 group">
                        <div className="relative">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 text-amber-500 group-hover:scale-110 transition-transform">
                                <path d="M9.375 3a1.875 1.875 0 000 3.75h1.875v4.5H3.375A1.875 1.875 0 011.5 9.375v-.75c0-1.036.84-1.875 1.875-1.875h3.193A3.375 3.375 0 0112 2.753a3.375 3.375 0 015.432 3.997h3.943c1.035 0 1.875.84 1.875 1.875v.75c0 1.036-.84 1.875-1.875 1.875H12.75v-4.5h1.875a1.875 1.875 0 10-1.875-1.875V6.75h-1.5V4.875C11.25 3.839 10.41 3 9.375 3zM11.25 12.75H3v6.75a2.25 2.25 0 002.25 2.25h6v-9zM12.75 12.75v9h6a2.25 2.25 0 002.25-2.25v-6.75h-8.25z" />
                            </svg>
                        </div>
                        <span>LovecestasePerfumes</span>
                    </a>
                    <div className="hidden lg:block flex-1 max-w-2xl mx-8">
                         <form onSubmit={handleSearchSubmit} className="relative">
                           <input
                                type="text" value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                placeholder="O que você procura?"
                                className="w-full bg-gray-800 text-white px-5 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500"/>
                           <button type="submit" className="absolute right-0 top-0 h-full px-4 text-gray-400 hover:text-amber-400"><SearchIcon className="h-5 w-5" /></button>
                            <AnimatePresence>
                            {isSearchFocused && searchTerm.length > 0 && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                                        <div className="max-h-96 overflow-y-auto">
                                            {searchSuggestions.length > 0 ? (
                                                searchSuggestions.map(p => (
                                                    <div key={p.id} onClick={() => handleSuggestionClick(p.id)} className="flex items-center p-3 hover:bg-gray-100 cursor-pointer transition-colors border-b last:border-b-0">
                                                        <img src={getFirstImage(p.images)} alt={p.name} className="w-16 h-16 object-contain mr-4 rounded-md bg-white p-1 border" />
                                                        <div className="flex-grow">
                                                            <p className="font-semibold text-gray-800">{p.name}</p>
                                                            {p.is_on_sale && p.sale_price > 0 ? (
                                                                <div className="flex items-baseline gap-2">
                                                                    <p className="text-red-600 font-bold">R$ {Number(p.sale_price).toFixed(2)}</p>
                                                                    <p className="text-gray-500 text-sm line-through">R$ {Number(p.price).toFixed(2)}</p>
                                                                </div>
                                                            ) : (
                                                                <p className="text-gray-700 font-bold">R$ {Number(p.price).toFixed(2)}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : ( <p className="p-4 text-center text-sm text-gray-500">Nenhum produto encontrado.</p> )}
                                        </div>
                                        {searchTerm.trim() && ( <button type="submit" className="w-full text-center p-3 bg-gray-50 hover:bg-gray-100 text-amber-600 font-semibold transition-colors"> Ver todos os resultados para "{searchTerm}" </button> )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        {isAuthenticated && ( 
                            <button onClick={() => onNavigate('account/orders')} className="hidden sm:flex items-center gap-1 hover:text-amber-400 transition px-2 py-1 relative"> 
                                <PackageIcon className="h-6 w-6"/> 
                                {/* --- NOTIFICAÇÃO NO HEADER DESKTOP --- */}
                                {orderNotificationCount > 0 && (
                                    <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white border-2 border-black transform translate-x-1/2 -translate-y-1/2 animate-bounce">
                                        {orderNotificationCount}
                                    </span>
                                )}
                                <div className="flex flex-col items-start text-xs leading-tight"> <span>Devoluções</span> <span className="font-bold">& Pedidos</span> </div> 
                            </button> 
                        )}
                        <button onClick={() => onNavigate('wishlist')} className="relative flex items-center gap-1 hover:text-amber-400 transition px-2 py-1"> <HeartIcon className="h-6 w-6"/> <span className="hidden sm:inline text-sm font-medium">Lista</span> {wishlist.length > 0 && <span className="absolute top-0 right-0 bg-amber-400 text-black text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">{wishlist.length}</span>} </button>
                        <motion.button animate={cartAnimationControls} onClick={() => onNavigate('cart')} className="relative flex items-center gap-1 hover:text-amber-400 transition px-2 py-1"> <CartIcon className="h-6 w-6"/> <span className="hidden sm:inline text-sm font-medium">Carrinho</span> {totalCartItems > 0 && <span className="absolute top-0 right-0 bg-amber-400 text-black text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">{totalCartItems}</span>} </motion.button>
                        <div className="hidden sm:block">
                            {isAuthenticated ? (
                                <div className="relative group">
                                   <button className="flex items-start gap-1 hover:text-amber-400 transition px-2 py-1 leading-none"> <UserIcon className="h-6 w-6 mt-0.5"/> <div className="flex flex-col items-start text-xs"> <span>Olá, {user.name.split(' ')[0]}</span> <span className="font-bold text-sm">Conta</span> </div> </button>
                                   <div className="absolute top-full right-0 w-48 bg-gray-900 rounded-md shadow-lg py-1 z-20 invisible group-hover:visible border border-gray-800"> <span className="block px-4 py-2 text-sm text-gray-400">Olá, {user.name}</span> <a href="#account" onClick={(e) => { e.preventDefault(); onNavigate('account'); }} className="block px-4 py-2 text-sm text-white hover:bg-gray-800">Minha Conta</a> {user.role === 'admin' && <a href="#admin" onClick={(e) => { e.preventDefault(); onNavigate('admin/dashboard');}} className="block px-4 py-2 text-sm text-amber-400 hover:bg-gray-800">Painel Admin</a>} <a href="#logout" onClick={(e) => {e.preventDefault(); logout(); onNavigate('home');}} className="block px-4 py-2 text-sm text-white hover:bg-gray-800">Sair</a> </div>
                                </div>
                            ) : ( <button onClick={() => onNavigate('login')} className="flex items-center gap-1 bg-amber-400 text-black px-4 py-2 rounded-md hover:bg-amber-300 transition font-bold"> <UserIcon className="h-5 w-5"/> <span className="text-sm">Login</span> </button> )}
                        </div>
                    </div>
                </div>
            </div>

             <div className="block md:hidden px-4 pt-3">
                <div className="flex justify-center items-center mb-3">
                    <a href="#home" onClick={(e) => { e.preventDefault(); onNavigate('home'); }} className="flex items-center gap-2 text-xl font-bold tracking-wide text-amber-400">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-amber-500">
                            <path d="M9.375 3a1.875 1.875 0 000 3.75h1.875v4.5H3.375A1.875 1.875 0 011.5 9.375v-.75c0-1.036.84-1.875 1.875-1.875h3.193A3.375 3.375 0 0112 2.753a3.375 3.375 0 015.432 3.997h3.943c1.035 0 1.875.84 1.875 1.875v.75c0 1.036-.84 1.875-1.875 1.875H12.75v-4.5h1.875a1.875 1.875 0 10-1.875-1.875V6.75h-1.5V4.875C11.25 3.839 10.41 3 9.375 3zM11.25 12.75H3v6.75a2.25 2.25 0 002.25 2.25h6v-9zM12.75 12.75v9h6a2.25 2.25 0 002.25-2.25v-6.75h-8.25z" />
                        </svg>
                        LovecestasePerfumes
                    </a>
                </div>
                <form onSubmit={handleSearchSubmit} className="relative mb-2">
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)} placeholder="Pesquisar em LovecestasePerfumes" className="w-full bg-gray-800 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm" />
                    <button type="submit" className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-amber-400"><SearchIcon className="h-5 w-5" /></button>
                    <AnimatePresence>
                        {isSearchFocused && searchTerm.length > 0 && (
                             <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                                <div className="max-h-60 overflow-y-auto">
                                    {searchSuggestions.length > 0 ? (
                                        searchSuggestions.map(p => (
                                            <div key={p.id} onClick={() => handleSuggestionClick(p.id)} className="flex items-center p-2 hover:bg-gray-100 cursor-pointer transition-colors border-b last:border-b-0"> <img src={getFirstImage(p.images)} alt={p.name} className="w-12 h-12 object-contain mr-3 rounded-md bg-white p-1 border" /> <div className="flex-grow"> <p className="font-semibold text-gray-800 text-sm">{p.name}</p> {p.is_on_sale && p.sale_price > 0 ? ( <p className="text-red-600 font-bold text-xs">R$ {Number(p.sale_price).toFixed(2)}</p> ) : ( <p className="text-gray-700 font-bold text-xs">R$ {Number(p.price).toFixed(2)}</p> )} </div> </div>
                                        ))
                                    ) : ( <p className="p-4 text-center text-sm text-gray-500">Nenhum produto encontrado.</p> )}
                                </div>
                                {searchTerm.trim() && ( <button type="submit" className="w-full text-center p-2 bg-gray-50 hover:bg-gray-100 text-amber-600 font-semibold transition-colors text-sm"> Ver todos os resultados </button> )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </form>
                 <button onClick={() => setIsAddressModalOpen(true)} className="w-full flex items-center text-xs text-gray-300 bg-gray-800/50 px-3 py-2 rounded-md cursor-pointer hover:bg-gray-700/50 transition-colors text-left"> <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0 text-amber-400"/> <span className="truncate flex-grow">{addressDisplay}</span> <ChevronDownIcon className="h-4 w-4 ml-auto flex-shrink-0"/> </button>
            </div>

            <nav className="hidden md:flex justify-center px-4 sm:px-6 h-12 items-center border-t border-gray-800 relative" onMouseLeave={() => setActiveMenu(null)}>
                <a href="#home" onClick={(e) => { e.preventDefault(); onNavigate('home'); }} className="px-4 py-2 text-sm font-semibold tracking-wider uppercase hover:text-amber-400 transition-colors">Início</a>
                <div className="h-full flex items-center" onMouseEnter={() => setActiveMenu('Coleções')}> <button className="px-4 py-2 text-sm font-semibold tracking-wider uppercase hover:text-amber-400 transition-colors">Coleções</button> </div>
                <a href="#products?promo=true" onClick={(e) => { e.preventDefault(); onNavigate('products?promo=true'); }} className="px-4 py-2 text-sm font-semibold tracking-wider uppercase text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"> <SaleIcon className="h-4 w-4" /> Promoções </a>
                <a href="#ajuda" onClick={(e) => { e.preventDefault(); onNavigate('ajuda'); }} className="px-4 py-2 text-sm font-semibold tracking-wider uppercase hover:text-amber-400 transition-colors">Ajuda</a>
                <AnimatePresence>
                    {activeMenu === 'Coleções' && (
                        <motion.div initial="closed" animate="open" exit="closed" variants={dropdownVariants} className="absolute top-full left-0 w-full bg-gray-900/95 backdrop-blur-sm shadow-2xl border-t border-gray-700">
                            <div className="container mx-auto p-8 grid grid-cols-6 gap-8">
                                {dynamicMenuItems.map(cat => ( cat && cat.sub && ( <div key={cat.name}> <h3 className="font-bold text-amber-400 mb-3 text-base">{cat.name}</h3> <ul className="space-y-2"> {cat.sub.map(subCat => ( <li key={subCat.name}><a href="#" onClick={(e) => { e.preventDefault(); onNavigate(`products?category=${subCat.filter}`); setActiveMenu(null); }} className="block text-sm text-white hover:text-amber-300 transition-colors">{subCat.name}</a></li> ))} </ul> </div> ) ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
                        <motion.div variants={mobileMenuVariants} initial="closed" animate="open" exit="closed" className="fixed top-0 left-0 h-screen w-4/5 max-w-sm bg-gray-900 z-[60] flex flex-col">
                            <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-800"> <h2 className="font-bold text-amber-400">Menu</h2> <button onClick={() => setIsMobileMenuOpen(false)}><CloseIcon className="h-6 w-6 text-white" /></button> </div>
                            <div className="flex-grow overflow-y-auto p-4">
                                {dynamicMenuItems.map((cat, index) => ( cat && cat.sub && ( <div key={cat.name} className="border-b border-gray-800"> <button onClick={() => setMobileAccordion(mobileAccordion === index ? null : index)} className="w-full flex justify-between items-center py-3 text-left font-bold text-white"> <span>{cat.name}</span> <ChevronDownIcon className={`h-5 w-5 transition-transform ${mobileAccordion === index ? 'rotate-180' : ''}`} /> </button> <AnimatePresence> {mobileAccordion === index && ( <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pl-4 pb-2 space-y-2 overflow-hidden"> {cat.sub.map(subCat => ( <li key={subCat.name}><a href="#" onClick={(e) => { e.preventDefault(); onNavigate(`products?category=${subCat.filter}`); setIsMobileMenuOpen(false); }} className="block text-sm text-gray-300 hover:text-amber-300">{subCat.name}</a></li> ))} </motion.ul> )} </AnimatePresence> </div> ) ))}
                                <div className="border-b border-gray-800"> <a href="#products?promo=true" onClick={(e) => { e.preventDefault(); onNavigate('products?promo=true'); setIsMobileMenuOpen(false); }} className="flex items-center gap-2 py-3 font-bold text-red-400 hover:text-red-300"> <SaleIcon className="h-5 w-5"/> Promoções </a> </div>
                                <div className="border-b border-gray-800"> <a href="#products" onClick={(e) => { e.preventDefault(); onNavigate('products'); setIsMobileMenuOpen(false); }} className="block py-3 font-bold text-white hover:text-amber-400">Ver Tudo</a> </div>
                                <div className="border-b border-gray-800"> <a href="#ajuda" onClick={(e) => { e.preventDefault(); onNavigate('ajuda'); setIsMobileMenuOpen(false); }} className="block py-3 font-bold text-white hover:text-amber-400">Ajuda</a> </div>
                                <div className="pt-4 space-y-3">
                                    {isAuthenticated ? ( 
                                        <> 
                                            <a href="#account" onClick={(e) => { e.preventDefault(); onNavigate('account'); setIsMobileMenuOpen(false); }} className="block text-white hover:text-amber-400">Minha Conta</a> 
                                            <a href="#account/orders" onClick={(e) => { e.preventDefault(); onNavigate('account/orders'); setIsMobileMenuOpen(false); }} className="flex items-center justify-between text-white hover:text-amber-400">
                                                <span>Devoluções e Pedidos</span>
                                                {/* --- CORREÇÃO DO BADGE NO DRAWER MOBILE --- */}
                                                {orderNotificationCount > 0 && <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 animate-pulse">{orderNotificationCount}</span>}
                                            </a> 
                                            {user.role === 'admin' && <a href="#admin" onClick={(e) => { e.preventDefault(); onNavigate('admin/dashboard'); setIsMobileMenuOpen(false);}} className="block text-amber-400 hover:text-amber-300">Painel Admin</a>} 
                                            <button onClick={() => { logout(); onNavigate('home'); setIsMobileMenuOpen(false); }} className="w-full text-left text-white hover:text-amber-400">Sair</button> 
                                        </> 
                                    ) : ( <button onClick={() => { onNavigate('login'); setIsMobileMenuOpen(false); }} className="w-full text-left bg-amber-400 text-black px-4 py-2 rounded-md hover:bg-amber-300 transition font-bold">Login</button> )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </header>

        <BottomNavBar />
        </>
    );
});

const CollectionsCarousel = memo(({ onNavigate, title }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const minSwipeDistance = 50;
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        apiService('/collections')
            .then(data => setCategories(data)) // Apenas define os dados na ordem recebida
            .catch(err => console.error("Falha ao buscar coleções:", err))
            .finally(() => setIsLoading(false));
    }, []);

    const updateItemsPerPage = useCallback(() => {
        if (window.innerWidth < 640) setItemsPerPage(2);
        else if (window.innerWidth < 768) setItemsPerPage(3);
        else if (window.innerWidth < 1024) setItemsPerPage(4);
        else setItemsPerPage(6);
    }, []);

    useEffect(() => {
        updateItemsPerPage();
        window.addEventListener('resize', updateItemsPerPage);
        return () => window.removeEventListener('resize', updateItemsPerPage);
    }, [updateItemsPerPage]);

    const goNext = useCallback(() => {
        const maxIndex = Math.max(0, categories.length - itemsPerPage);
        setCurrentIndex(prev => Math.min(prev + 1, maxIndex));
    }, [categories.length, itemsPerPage]);

    const goPrev = useCallback(() => {
        setCurrentIndex(prev => Math.max(prev - 1, 0));
    }, []);

    if (isLoading) {
        return (
            <section className="bg-black text-white py-12 md:py-16">
                <div className="container mx-auto px-4">
                    {title && <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">{title}</h2>}
                    <div className="animate-pulse flex justify-center items-center h-48">
                        <SpinnerIcon className="h-8 w-8 text-amber-500" />
                    </div>
                </div>
            </section>
        );
    }

    if (!categories || categories.length === 0) return null;

    const canGoPrev = currentIndex > 0;
    const canGoNext = categories.length > itemsPerPage && currentIndex < (categories.length - itemsPerPage);

    const handleTouchStart = (e) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
    const handleTouchMove = (e) => { setTouchEnd(e.targetTouches[0].clientX); };
    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        if (distance > minSwipeDistance && canGoNext) goNext();
        else if (distance < -minSwipeDistance && canGoPrev) goPrev();
        setTouchStart(null);
        setTouchEnd(null);
    };

    return (
        <section className="bg-black text-white py-12 md:py-16">
            <div className="container mx-auto px-4">
                {title && <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">{title}</h2>}
                <div className="relative group">
                    <div 
                        className="overflow-hidden"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        <motion.div
                            className="flex -mx-2"
                            animate={{ x: `-${currentIndex * (100 / itemsPerPage)}%` }}
                            transition={{ type: 'spring', stiffness: 350, damping: 40 }}
                        >
                            {categories.map(cat => (
                                <div 
                                    key={cat.name} 
                                    className="flex-shrink-0 px-2"
                                    style={{ width: `${100 / itemsPerPage}%` }}
                                >
                                    <div className="relative rounded-lg overflow-hidden aspect-[4/5] group cursor-pointer" onClick={() => onNavigate(`products?category=${cat.filter}`)}>
                                        <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-2 transition-all group-hover:bg-black/60">
                                            <h3 className="text-xl font-semibold text-white text-center tracking-wide" style={{ textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>{cat.name}</h3>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                    {/* Botões de Navegação - Visíveis sempre que houver mais itens para mostrar */}
                    {canGoPrev && (
                        <button onClick={goPrev} className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-2 md:-translate-x-4 bg-white/50 hover:bg-white text-black p-2 rounded-full shadow-lg z-10 transition-opacity">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                    )}
                    {canGoNext && (
                         <button onClick={goNext} className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-2 md:translate-x-4 bg-white/50 hover:bg-white text-black p-2 rounded-full shadow-lg z-10 transition-opacity">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
});

// Adicione estes componentes antes da função HomePage ou no início do arquivo se preferir organizar assim


const BenefitsBar = () => (
    <div className="bg-gray-900 border-b border-gray-800 py-4 md:py-8">
        <div className="container mx-auto px-4">
            {/* Grid ajustado: 2 colunas no mobile, 4 no desktop */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
                {[
                    { icon: TruckIcon, title: "Frete Grátis", desc: "Acima de R$ 299", visibleOnMobile: true },
                    { icon: CreditCardIcon, title: "4x Sem Juros", desc: "No cartão de crédito", visibleOnMobile: true },
                    { icon: ShieldCheckIcon, title: "Compra Segura", desc: "Proteção de dados", visibleOnMobile: false },
                    { icon: ArrowUturnLeftIcon, title: "Troca Fácil", desc: "1ª troca grátis", visibleOnMobile: false },
                ].map((item, index) => (
                    <div 
                        key={index} 
                        className={`flex-col items-center text-center group p-3 rounded-lg bg-gray-800/30 md:bg-transparent md:hover:bg-gray-800/50 transition-all border border-gray-800 md:border-transparent ${item.visibleOnMobile ? 'flex' : 'hidden md:flex'}`}
                    >
                        <div className="p-2 md:p-3 bg-gray-800 rounded-full mb-2 md:mb-3 group-hover:bg-gray-700 transition-colors shadow-lg">
                            <item.icon className="h-5 w-5 md:h-6 md:w-6 text-amber-400 group-hover:scale-110 transition-transform" />
                        </div>
                        <h3 className="font-bold text-white text-xs md:text-sm uppercase tracking-wide whitespace-nowrap">{item.title}</h3>
                        <p className="text-[10px] md:text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const NewsletterSection = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');
    const notification = useNotification();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        setStatus('loading');
        setMessage('');

        try {
            const response = await apiService('/newsletter/subscribe', 'POST', { email });
            setStatus('success');
            setMessage(response.message);
            setEmail('');
            notification.show("Bem-vindo ao Clube VIP!", "success");
        } catch (error) {
            setStatus('error');
            setMessage(error.message || "Erro ao se inscrever. Tente novamente.");
            // Não mostramos notificação flutuante aqui para manter o feedback contextual na seção
        }
    };

    return (
        <section className="bg-gradient-to-r from-amber-500 to-amber-600 py-10 md:py-16 mt-8 md:mt-16 relative overflow-hidden">
            {/* Padrão de fundo decorativo */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-10 relative z-10">
                <div className="text-center lg:text-left text-black max-w-xl">
                    <h2 className="text-2xl md:text-4xl font-extrabold flex flex-col md:flex-row items-center lg:items-start gap-2 md:gap-3 mb-2 md:mb-3 leading-tight">
                        <span className="bg-black text-amber-500 p-1.5 md:p-2 rounded-lg shadow-lg transform -rotate-3"><SparklesIcon className="h-6 w-6 md:h-8 md:w-8" /></span>
                        <span>Clube VIP</span>
                    </h2>
                    <p className="font-medium text-black/90 text-sm md:text-lg px-2 md:px-0">
                        Cadastre-se e receba <span className="font-bold border-b-2 border-black">ofertas exclusivas</span> e cupons surpresa diretamente no seu e-mail.
                    </p>
                </div>
                
                <div className="w-full lg:w-auto max-w-lg">
                    <form className="flex flex-col sm:flex-row gap-3 bg-white/20 p-2 rounded-xl backdrop-blur-sm shadow-sm transition-all focus-within:ring-2 focus-within:ring-black/20" onSubmit={handleSubmit}>
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Seu melhor e-mail" 
                            className="w-full px-4 py-3 md:px-6 md:py-4 rounded-lg border-0 focus:ring-0 text-gray-900 placeholder-gray-600 font-medium text-sm md:text-base outline-none bg-white/90 focus:bg-white transition-colors"
                            required
                            disabled={status === 'loading' || status === 'success'}
                        />
                        <button 
                            type="submit" 
                            disabled={status === 'loading' || status === 'success'}
                            className={`px-6 py-3 md:px-8 md:py-4 rounded-lg font-bold text-sm md:text-lg transition-all shadow-lg flex items-center justify-center gap-2 whitespace-nowrap
                                ${status === 'success' 
                                    ? 'bg-green-600 text-white cursor-default' 
                                    : 'bg-black text-white hover:bg-gray-900 active:scale-95'
                                } disabled:opacity-80`}
                        >
                            {status === 'loading' ? (
                                <SpinnerIcon className="h-5 w-5 md:h-6 md:w-6 text-amber-500"/>
                            ) : status === 'success' ? (
                                <>Inscrito <CheckIcon className="h-5 w-5 md:h-6 md:w-6"/></>
                            ) : (
                                <>Cadastrar <CheckIcon className="h-4 w-4 md:h-5 md:w-5 text-amber-500"/></>
                            )}
                        </button>
                    </form>
                    
                    {/* Mensagens de Feedback */}
                    <AnimatePresence>
                        {message && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0 }}
                                className={`mt-3 text-sm font-bold text-center lg:text-left px-2 py-1 rounded ${status === 'error' ? 'text-red-800 bg-red-100/80 inline-block' : 'text-black'}`}
                            >
                                {status === 'success' && <span className="mr-1">🎉</span>}
                                {message}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
};

// --- PÁGINAS DO CLIENTE ---
// Componente Interno do Banner de Destaque (Carrossel)
// Movido para fora para evitar recriação a cada renderização da HomePage
const PromoBannerSection = ({ customBanners, onNavigate }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    
    // Dados Padrão (Fallback visual se o banco estiver vazio)
    const defaultBanner = [{
        image_url: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?q=80&w=2070&auto=format&fit=crop",
        title: "Semana do Consumidor",
        subtitle: "Até 50% OFF em itens selecionados.",
        cta_text: "Ver Ofertas",
        link_url: "products?promo=true",
        isFlashOffer: true,
        id: 'default'
    }];

    // Usa os banners do banco se existirem, senão usa o padrão
    const activeBanners = customBanners && customBanners.length > 0 ? customBanners : defaultBanner;
    
    // Lógica de Rotação Automática
    useEffect(() => {
        if (activeBanners.length > 1) {
            const timer = setTimeout(() => {
                setCurrentIndex(prev => (prev === activeBanners.length - 1 ? 0 : prev + 1));
            }, 5000); // 5 segundos por slide
            return () => clearTimeout(timer);
        }
    }, [currentIndex, activeBanners.length]);

    // Garante que o índice não estoure se a lista mudar
    const safeIndex = currentIndex >= activeBanners.length ? 0 : currentIndex;
    const currentBanner = activeBanners[safeIndex];
    
    if (!currentBanner) return null;

    const isFlashOffer = currentBanner.isFlashOffer || 
                            currentBanner.title?.toLowerCase().includes('relâmpago') || 
                            currentBanner.subtitle?.toLowerCase().includes('relâmpago');

    const renderTitle = () => {
        if (currentBanner.id === 'default' && currentBanner.title === "Semana do Consumidor") {
            return (<>Semana do <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Consumidor</span></>);
        }
        return currentBanner.title;
    };

    return (
        <section className="container mx-auto px-4 mb-12 mt-4 md:mt-8">
            <AnimatePresence mode="wait">
                <motion.div 
                    key={currentBanner.id || safeIndex} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="rounded-xl md:rounded-2xl overflow-hidden relative h-[350px] md:h-[500px] flex items-center bg-cover bg-center cursor-pointer group shadow-2xl border border-gray-800"
                    style={{ backgroundImage: `url(${currentBanner.image_url})` }}
                    onClick={() => onNavigate(currentBanner.link_url.replace(/^#/, ''))}
                >
                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/95 via-black/40 to-transparent transition-all duration-500"></div>
                    <div className="relative z-10 w-full px-6 md:px-16 pb-8 md:pb-0 flex flex-col items-center md:items-start justify-end md:justify-center h-full text-center md:text-left">
                        {isFlashOffer && (
                            <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-red-600 text-white text-xs md:text-sm font-bold px-3 py-1 md:px-4 md:py-1.5 rounded-full uppercase tracking-wider mb-3 md:mb-6 inline-flex items-center gap-2 shadow-lg">
                                <ClockIcon className="h-3 w-3 md:h-4 md:w-4" /> Oferta Relâmpago
                            </motion.span>
                        )}
                        <motion.h2 initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-7xl font-extrabold mb-3 md:mb-6 text-white drop-shadow-lg leading-tight">
                            {renderTitle()}
                        </motion.h2>
                        {currentBanner.subtitle && (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-base md:text-xl text-gray-200 mb-6 md:mb-10 max-w-xs md:max-w-lg font-light leading-snug">
                                {currentBanner.subtitle}
                            </motion.p>
                        )}
                        {currentBanner.cta_enabled !== 0 && (
                            <motion.button whileTap={{ scale: 0.95 }} className="bg-white text-black px-8 py-3 md:px-12 md:py-4 rounded-full font-bold text-sm md:text-lg hover:bg-amber-400 transition-all shadow-xl flex items-center gap-2 md:gap-3">
                                {currentBanner.cta_text || 'Ver Ofertas'} <ArrowUturnLeftIcon className="h-4 w-4 md:h-5 md:w-5 rotate-180"/>
                            </motion.button>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>
            
            {/* Indicadores de Slide (Dots) se houver mais de 1 banner */}
            {activeBanners.length > 1 && (
                <div className="flex justify-center mt-4 gap-2">
                    {activeBanners.map((_, idx) => (
                        <button 
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                            className={`w-2 h-2 rounded-full transition-all ${safeIndex === idx ? 'bg-amber-500 w-4' : 'bg-gray-600'}`}
                            aria-label={`Ir para banner ${idx + 1}`}
                        />
                    ))}
                </div>
            )}
        </section>
    );
};

// Componente Cards Inferiores
// Movido para fora para evitar recriação a cada renderização da HomePage
const CategoryCardsSection = ({ customCards, onNavigate }) => {
    const defaultCards = [
        {
            image_url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop",
            title: "Moda & Estilo", subtitle: "Peças exclusivas.", cta_text: "Explorar Roupas", link_url: "products?category=Roupas"
        },
        {
            image_url: "https://images.unsplash.com/photo-1615634260167-c8cdede054de?q=80&w=1974&auto=format&fit=crop",
            title: "Perfumaria", subtitle: "Fragrâncias marcantes.", cta_text: "Ver Perfumes", link_url: "products?category=Perfumes"
        }
    ];

    const card1 = (customCards && customCards.length > 0) ? customCards[0] : defaultCards[0];
    const card2 = (customCards && customCards.length > 1) ? customCards[1] : defaultCards[1];
    const cardsToRender = [card1, card2];

    return (
        <section className="container mx-auto px-4 py-8 md:py-12 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-10 text-center">Navegue por Universo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                {cardsToRender.map((card, index) => (
                    <div 
                        key={index}
                        onClick={() => onNavigate(card.link_url.replace(/^#/, ''))}
                        className="relative h-64 md:h-[400px] rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer group shadow-lg border border-gray-800"
                    >
                        <img src={card.image_url} alt={card.title} className="w-full h-full object-cover"/>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-6 md:p-10">
                            <h3 className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-3">{card.title}</h3>
                            <p className="text-gray-300 text-sm md:text-lg mb-3 md:mb-6 line-clamp-1 md:line-clamp-none">{card.subtitle}</p>
                            <span className="inline-flex items-center gap-2 text-white text-xs md:text-sm font-bold underline decoration-amber-500 underline-offset-4">
                                {card.cta_text || 'Ver Mais'} &rarr;
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

const CategoriesPage = ({ onNavigate }) => {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const { user, isAuthenticated, logout } = useAuth(); // Acesso ao logout
    const { orderNotificationCount } = useShop(); // NOVO: Acesso às notificações

    const groupedCategories = useMemo(() => {
        const groups = {};
        const sectionOrder = ['Roupas', 'Perfumaria', 'Calçados', 'Moda Íntima', 'Conjuntos', 'Acessórios'];

        categories.forEach(cat => {
            const section = cat.menu_section || 'Outros';
            if (!groups[section]) {
                groups[section] = {
                    title: section,
                    items: [],
                    image: cat.image 
                };
            }
            groups[section].items.push(cat);
        });

        return Object.values(groups).sort((a, b) => {
            const indexA = sectionOrder.indexOf(a.title);
            const indexB = sectionOrder.indexOf(b.title);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }, [categories]);

    useEffect(() => {
        const controller = new AbortController();
        setIsLoading(true);
        
        apiService('/collections', 'GET', null, { signal: controller.signal })
            .then(data => {
                if (Array.isArray(data)) {
                    setCategories(data.sort((a, b) => a.display_order - b.display_order));
                }
            })
            .catch(err => {
                if (err.name !== 'AbortError') console.error("Erro ao buscar categorias:", err);
            })
            .finally(() => setIsLoading(false));

        return () => controller.abort();
    }, []);

    // Sub-tela (Nível 2) - Estilo Dark
    const SubCategoryView = ({ group, onBack }) => (
        <motion.div 
            initial={{ x: '100%' }} 
            animate={{ x: 0 }} 
            exit={{ x: '100%' }} 
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
            className="fixed inset-0 bg-black z-50 overflow-y-auto pb-24" // Fundo Preto
        >
            <div className="sticky top-0 bg-black/95 backdrop-blur-md border-b border-gray-800 z-10 px-4 py-4 flex items-center shadow-md">
                <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors mr-3">
                    <ArrowUturnLeftIcon className="h-6 w-6" />
                </button>
                <h2 className="text-lg font-bold text-white tracking-wide">{group.title}</h2>
            </div>

            <div className="p-4">
                <h3 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-wider px-1 border-l-2 border-amber-500 pl-2">
                    Explorar {group.title}
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                    {group.items.map(item => (
                        <div 
                            key={item.id}
                            onClick={() => onNavigate(`products?category=${item.filter}`)}
                            className="bg-gray-900 rounded-lg overflow-hidden shadow-sm border border-gray-800 cursor-pointer active:scale-95 transition-transform flex flex-col group"
                        >
                            <div className="aspect-square bg-white relative p-2 overflow-hidden">
                                <img 
                                    src={item.image} 
                                    alt={item.name} 
                                    className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-110"
                                    loading="lazy"
                                />
                            </div>
                            <div className="p-3 bg-gray-900 flex-grow flex items-center justify-center text-center border-t border-gray-800">
                                <span className="text-sm font-medium text-gray-200 leading-tight line-clamp-2 group-hover:text-amber-400 transition-colors">
                                    {item.name}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                
                <button 
                    onClick={() => onNavigate(`products?search=${group.title}`)}
                    className="w-full mt-8 py-3.5 bg-gray-800 border border-gray-700 text-white font-bold rounded-lg shadow-md hover:bg-gray-700 hover:border-amber-500/50 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide"
                >
                    Ver todos em {group.title} <ArrowUturnLeftIcon className="h-4 w-4 rotate-180 text-amber-500"/>
                </button>
            </div>
        </motion.div>
    );

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black pt-20 flex justify-center">
                <SpinnerIcon className="h-8 w-8 text-amber-400" />
            </div>
        );
    }

    // Atalhos Rápidos (Estilo Amazon)
    const QuickShortcuts = () => (
        <div className="bg-gray-900 p-4 rounded-xl mb-6 shadow-lg border border-gray-800 grid grid-cols-2 gap-4">
            {isAuthenticated ? (
                <>
                    {/* --- CORREÇÃO DO BOTÃO "MEUS PEDIDOS" NA TELA DE MENU --- */}
                    <button onClick={() => onNavigate('account/orders')} className="bg-black border border-gray-700 p-4 rounded-lg flex flex-col items-center justify-center text-center hover:bg-gray-800 active:scale-95 transition-all relative">
                        <div className="relative">
                            <PackageIcon className="h-6 w-6 text-amber-400 mb-2"/>
                            {orderNotificationCount > 0 && (
                                <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-black animate-pulse">
                                    {orderNotificationCount}
                                </span>
                            )}
                        </div>
                        <span className="text-sm font-bold text-gray-200">Meus Pedidos</span>
                    </button>

                    <button onClick={() => onNavigate('account')} className="bg-black border border-gray-700 p-4 rounded-lg flex flex-col items-center justify-center text-center hover:bg-gray-800 active:scale-95 transition-all">
                        <UserIcon className="h-6 w-6 text-amber-400 mb-2"/>
                        <span className="text-sm font-bold text-gray-200">Minha Conta</span>
                    </button>
                    {user?.role === 'admin' && (
                        <button onClick={() => onNavigate('admin/dashboard')} className="col-span-2 bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600 p-3 rounded-lg flex items-center justify-center gap-3 hover:from-gray-700 hover:to-gray-600 active:scale-95 transition-all shadow-md">
                            <AdminIcon className="h-5 w-5 text-amber-400"/>
                            <span className="text-sm font-bold text-white uppercase tracking-wide">Acessar Painel Admin</span>
                        </button>
                    )}
                </>
            ) : (
                <div className="col-span-2 bg-black border border-gray-700 p-4 rounded-lg flex flex-col items-center text-center">
                    <p className="text-sm text-gray-400 mb-3">Faça login para ver seus pedidos e conta.</p>
                    <button onClick={() => onNavigate('login')} className="w-full bg-amber-500 text-black font-bold py-2 rounded hover:bg-amber-400 transition-colors">
                        Fazer Login / Criar Conta
                    </button>
                </div>
            )}
             <button onClick={() => onNavigate('ajuda')} className="col-span-2 bg-black border border-gray-700 p-3 rounded-lg flex items-center justify-between px-4 hover:bg-gray-800 active:scale-95 transition-all">
                <span className="text-sm font-bold text-gray-200 flex items-center gap-2"><SparklesIcon className="h-4 w-4 text-amber-400"/> Central de Ajuda e Atendimento</span>
                <ArrowUturnLeftIcon className="h-4 w-4 text-gray-500 rotate-180"/>
            </button>
            
            {/* Botão de Logout adicionado */}
            {isAuthenticated && (
                <button onClick={() => { logout(); onNavigate('home'); }} className="col-span-2 bg-red-900/20 border border-red-900/50 p-3 rounded-lg flex items-center justify-center gap-2 hover:bg-red-900/30 active:scale-95 transition-all text-red-400 font-bold text-sm">
                    Sair da Conta
                </button>
            )}
        </div>
    );

    return (
        <div className="bg-black min-h-screen pt-2 pb-24 text-white"> {/* Fundo Preto Global */}
            <AnimatePresence>
                {selectedGroup && (
                    <SubCategoryView 
                        group={selectedGroup} 
                        onBack={() => setSelectedGroup(null)} 
                    />
                )}
            </AnimatePresence>

            <div className="container mx-auto px-4">
                {/* Atalhos Rápidos no Topo */}
                <h1 className="text-xl font-bold text-white mb-3 px-1 mt-4">Acesso Rápido</h1>
                <QuickShortcuts />

                <h1 className="text-xl font-bold text-white mb-4 px-1 mt-2 border-l-4 border-amber-500 pl-3">Departamentos</h1>
                
                {/* Grade Principal (Nível 1) - Dark Mode */}
                <div className="grid grid-cols-2 gap-3"> 
                    {/* Card Especial: Promoções (Antigo Ofertas do Dia) */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0 }}
                        onClick={() => onNavigate('products?promo=true')}
                        className="col-span-2 bg-gradient-to-r from-red-900 via-red-800 to-black rounded-lg shadow-lg border border-red-900/50 overflow-hidden cursor-pointer active:scale-95 transition-transform flex flex-row items-center justify-between p-4 relative group mb-2"
                    >
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center border border-red-500/30 group-hover:bg-red-600/40 transition-colors">
                                <SaleIcon className="h-6 w-6 text-red-500 group-hover:text-red-400" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-white font-bold text-lg uppercase tracking-wide">Promoções</h3>
                                <p className="text-red-300 text-xs font-medium">Ver todos os produtos em oferta</p>
                            </div>
                        </div>
                        <ArrowUturnLeftIcon className="h-5 w-5 text-red-500 rotate-180 relative z-10"/>
                         {/* Padrão de fundo sutil */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    </motion.div>

                    {groupedCategories.map((group, idx) => (
                        <motion.div
                            key={group.title}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.03 }}
                            onClick={() => setSelectedGroup(group)}
                            className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 overflow-hidden cursor-pointer active:scale-95 transition-transform group"
                        >
                            <div className="aspect-[5/4] bg-white relative p-4 flex items-center justify-center overflow-hidden">
                                <img 
                                    src={group.items[0]?.image || 'https://placehold.co/400x300/eee/ccc?text=Sem+Imagem'} 
                                    alt={group.title} 
                                    className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                                    loading="lazy"
                                />
                                {/* Gradiente sutil para profundidade */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
                            </div>
                            <div className="p-3 border-t border-gray-800 bg-gray-900">
                                <h3 className="text-gray-100 font-bold text-sm leading-tight mb-0.5 group-hover:text-amber-400 transition-colors">
                                    {group.title}
                                </h3>
                                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                                    {group.items.length} opções
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};
const HomePage = ({ onNavigate }) => {
    const [products, setProducts] = useState({
        newArrivals: [],
        bestSellers: [],
        clothing: [],
        perfumes: []
    });
    
    // Estado unificado para banners
    const [banners, setBanners] = useState({
        carousel: [],
        promo: [], // Agora é um array para suportar múltiplos destaques
        cards: []
    });
    const [isLoadingBanners, setIsLoadingBanners] = useState(true);

    useEffect(() => {
        // --- BUSCA DE PRODUTOS ---
        const controller = new AbortController();
        apiService('/products', 'GET', null, { signal: controller.signal })
            .then(data => {
                const sortedByDate = [...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                const sortedBySales = [...data].sort((a, b) => (b.sales || 0) - (a.sales || 0));
                
                const clothingProducts = data.filter(p => p.product_type === 'clothing');
                const perfumeProducts = data.filter(p => p.product_type === 'perfume');

                setProducts({
                    newArrivals: sortedByDate,
                    bestSellers: sortedBySales,
                    clothing: clothingProducts,
                    perfumes: perfumeProducts
                });
            })
            .catch(err => {
                if (err.name !== 'AbortError') console.error("Falha ao buscar produtos:", err);
            });

        // --- BUSCA DE BANNERS ---
        apiService('/banners', 'GET', null, { signal: controller.signal })
            .then(data => {
                if (Array.isArray(data)) {
                    // SEPARAÇÃO POR ORDEM:
                    const carousel = data.filter(b => b.display_order < 50).sort((a, b) => a.display_order - b.display_order);
                    
                    // Pega TODOS os banners de destaque (ordem 50) para rotacionar
                    // O backend já garante que só vêm os ativos e dentro da data
                    const promo = data.filter(b => b.display_order === 50);
                    
                    const cards = data.filter(b => b.display_order >= 60).sort((a, b) => a.display_order - b.display_order).slice(0, 2);

                    setBanners({
                        carousel: carousel,
                        promo: promo,
                        cards: cards
                    });
                }
            })
            .catch(err => {
                if (err.name !== 'AbortError') console.error("Falha ao buscar banners:", err);
            })
            .finally(() => setIsLoadingBanners(false));

        return () => controller.abort();
    }, []);

    return (
      <div className="bg-black min-h-screen pb-0 overflow-x-hidden">
        {/* Banner Principal Rotativo */}
        {isLoadingBanners ? (
            <div className="relative h-[90vh] sm:h-[70vh] bg-gray-900 flex items-center justify-center">
                <SpinnerIcon className="h-10 w-10 text-amber-400" />
            </div>
        ) : (
            banners.carousel.length > 0 && <BannerCarousel banners={banners.carousel} onNavigate={onNavigate} />
        )}
        
        <BenefitsBar />
        
        {/* Carrossel de Categorias */}
        <div className="py-8 md:py-12 bg-black">
             <CollectionsCarousel onNavigate={onNavigate} title="Coleções" />
        </div>

        {/* Destaque Visual (Carrossel de Campanhas) */}
        <PromoBannerSection customBanners={banners.promo} onNavigate={onNavigate} />

        {/* Seção Lançamentos */}
        <section className="bg-black text-white py-8 md:py-12">
          <div className="container mx-auto px-4">
              <div className="flex items-end justify-between mb-6 md:mb-10 border-b border-gray-800 pb-4">
                  <div>
                      <h2 className="text-2xl md:text-4xl font-bold flex items-center gap-2 md:gap-3">
                          <span className="w-1.5 h-6 md:w-2 md:h-10 bg-amber-500 rounded-full block"></span>
                          Lançamentos
                      </h2>
                      <p className="text-gray-400 mt-1 md:mt-2 text-xs md:text-base ml-3 md:ml-5">Novidades que acabaram de chegar.</p>
                  </div>
                  <button onClick={() => onNavigate('products')} className="text-amber-400 hover:text-white transition-colors text-xs md:text-sm font-bold flex items-center gap-1 md:gap-2 group px-2 py-1 md:px-4 md:py-2 rounded-lg hover:bg-gray-900">
                      Ver tudo <ArrowUturnLeftIcon className="h-3 w-3 md:h-4 md:w-4 rotate-180 group-hover:translate-x-1 transition-transform"/>
                  </button>
              </div>
              <ProductCarousel products={products.newArrivals} onNavigate={onNavigate} />
          </div>
        </section>
        
        {/* Seção Mais Vendidos */}
        <section className="bg-gray-900/50 py-10 md:py-16 my-4 md:my-8 border-y border-gray-800 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
          <div className="container mx-auto px-4 relative z-10">
             <div className="text-center mb-8 md:mb-12">
                  <span className="text-amber-500 font-bold tracking-widest text-[10px] md:text-xs uppercase mb-1 md:mb-2 block">Preferidos dos Clientes</span>
                  <h2 className="text-2xl md:text-5xl font-extrabold text-white flex items-center justify-center gap-2 md:gap-3">
                      <SparklesIcon className="h-6 w-6 md:h-8 md:w-8 text-amber-400"/> Mais Vendidos
                  </h2>
              </div>
             <ProductCarousel products={products.bestSellers} onNavigate={onNavigate} />
          </div>
        </section>

        {/* Cards de Categoria (Inferior) */}
        <CategoryCardsSection customCards={banners.cards} onNavigate={onNavigate} />
        
        {/* Vitrine Roupas */}
        <section className="bg-black text-white py-8 md:py-10 border-t border-gray-800">
          <div className="container mx-auto px-4">
              <div className="flex items-end justify-between mb-6 md:mb-8">
                  <div className="flex items-center gap-3 md:gap-4">
                      <div className="bg-gray-800 p-2 md:p-3 rounded-full"><ShirtIcon className="h-5 w-5 md:h-6 md:w-6 text-amber-400"/></div>
                      <h2 className="text-xl md:text-3xl font-bold">Roupas em Destaque</h2>
                  </div>
                  <button onClick={() => onNavigate('products?category=Roupas')} className="text-amber-400 hover:text-white transition-colors text-xs md:text-sm font-bold flex items-center gap-1 md:gap-2 group px-2 py-1 md:px-4 md:py-2 rounded-lg hover:bg-gray-900">
                      Ver tudo <ArrowUturnLeftIcon className="h-3 w-3 md:h-4 md:w-4 rotate-180 group-hover:translate-x-1 transition-transform"/>
                  </button>
              </div>
              <ProductCarousel products={products.clothing} onNavigate={onNavigate} />
          </div>
        </section>

        {products.perfumes.length > 0 && (
            <section className="bg-black text-white py-8 md:py-12 border-t border-gray-800">
                <div className="container mx-auto px-4">
                    <div className="flex items-end justify-between mb-6 md:mb-8">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="bg-gray-800 p-2 md:p-3 rounded-full"><SparklesIcon className="h-5 w-5 md:h-6 md:w-6 text-amber-400"/></div>
                            <h2 className="text-xl md:text-3xl font-bold">Perfumaria Selecionada</h2>
                        </div>
                        <button onClick={() => onNavigate('products?category=Perfumes')} className="text-amber-400 hover:text-white transition-colors text-xs md:text-sm font-bold flex items-center gap-1 md:gap-2 group px-2 py-1 md:px-4 md:py-2 rounded-lg hover:bg-gray-900">
                            Ver tudo <ArrowUturnLeftIcon className="h-3 w-3 md:h-4 md:w-4 rotate-180 group-hover:translate-x-1 transition-transform"/>
                        </button>
                    </div>
                    <ProductCarousel products={products.perfumes} onNavigate={onNavigate} />
                </div>
            </section>
        )}

        <NewsletterSection />
      </div>
    );
};

// ===== ATUALIZAÇÃO PROMOÇÕES =====
const ProductsPage = ({ onNavigate, initialSearch = '', initialCategory = '', initialBrand = '', initialIsPromo = false }) => {
    const [allProducts, setAllProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [filters, setFilters] = useState({ search: initialSearch, brand: initialBrand, category: initialCategory });
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [uniqueCategories, setUniqueCategories] = useState([]);
    const productsPerPage = 12;

    useEffect(() => {
        const controller = new AbortController();
        setIsLoading(true);
        
        Promise.all([
            apiService('/products', 'GET', null, { signal: controller.signal }),
            apiService('/collections', 'GET', null, { signal: controller.signal })
        ]).then(([productsData, collectionsData]) => {
            setAllProducts(productsData);
            // Cria uma lista única de categorias a partir das coleções ativas
            const activeCategories = collectionsData.map(cat => cat.filter);
            setUniqueCategories([...new Set(activeCategories)].sort());
        }).catch(err => {
            if (err.name !== 'AbortError') console.error("Falha ao buscar dados da página de produtos:", err);
        }).finally(() => {
            setIsLoading(false);
        });

        return () => controller.abort();
    }, []);
    
    useEffect(() => {
        setFilters(prev => ({...prev, search: initialSearch, category: initialCategory, brand: initialBrand}));
    }, [initialSearch, initialCategory, initialBrand]);

    useEffect(() => {
        let result = [...allProducts];

        if (initialIsPromo) {
            result = result.filter(p => p.is_on_sale);
        }

        if (filters.search) {
            result = result.filter(p => 
                p.name.toLowerCase().includes(filters.search.toLowerCase()) || 
                p.brand.toLowerCase().includes(filters.search.toLowerCase())
            );
        }
        if (filters.brand) {
            result = result.filter(p => p.brand === filters.brand);
        }
        if (filters.category) {
            // CORREÇÃO: Lógica para mapear categorias genéricas dos banners para tipos de produto
            if (filters.category === 'Roupas') {
                result = result.filter(p => p.product_type === 'clothing');
            } else if (filters.category === 'Perfumes') {
                result = result.filter(p => p.product_type === 'perfume');
            } else {
                // Filtro padrão exato para categorias específicas (ex: "Blusas")
                result = result.filter(p => p.category === filters.category);
            }
        }
        setFilteredProducts(result);
        setCurrentPage(1);
    }, [filters, allProducts, initialIsPromo]);
    
    const uniqueBrands = [...new Set(allProducts.map(p => p.brand))];
    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    
    const ProductSkeleton = () => (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex flex-col h-full animate-pulse">
            <div className="h-64 bg-gray-700"></div>
            <div className="p-5 flex-grow flex flex-col">
                <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
                <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="h-5 bg-gray-700 rounded w-1/2 mb-auto"></div>
                <div className="h-8 bg-gray-700 rounded w-1/3 mt-4"></div>
                <div className="mt-4 flex items-stretch space-x-2">
                    <div className="h-10 bg-gray-700 rounded flex-grow"></div>
                    <div className="h-10 w-12 bg-gray-700 rounded"></div>
                </div>
            </div>
        </div>
    );
    
    const gridContainerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const pageTitle = initialIsPromo ? 'Produtos em Promoção' : 'Nossa Coleção';

    return (
        <div className="bg-black text-white py-12 min-h-screen">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{pageTitle}</h2>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <aside className="lg:col-span-1 bg-gray-900 p-6 rounded-lg shadow-md h-fit lg:sticky lg:top-28">
                        <h3 className="text-xl font-bold mb-4 text-amber-400">Filtros</h3>
                        <div className="space-y-4">
                            <input type="text" placeholder="Buscar por nome..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
                             <select value={filters.brand} onChange={e => setFilters({...filters, brand: e.target.value})} className="w-full p-2 bg-gray-800 border border-gray-700 rounded">
                                <option value="">Todas as Marcas</option>
                                {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <select value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})} className="w-full p-2 bg-gray-800 border border-gray-700 rounded">
                                <option value="">Todas as Categorias</option>
                                <option value="Roupas">Roupas (Geral)</option>
                                <option value="Perfumes">Perfumes (Geral)</option>
                                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </aside>
                    <main className="lg:col-span-3">
                        <motion.div 
                            variants={gridContainerVariants}
                            initial="hidden"
                            animate="visible"
                            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                        >
                           {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => <ProductSkeleton key={i} />)
                            ) : currentProducts.length > 0 ? (
                                currentProducts.map(p => <ProductCard key={p.id} product={p} onNavigate={onNavigate} />)
                            ) : (
                                <p className="col-span-full text-center text-gray-500">Nenhum produto encontrado para sua busca.</p>
                            )}
                        </motion.div>
                        {totalPages > 1 && (
                            <div className="flex justify-center mt-8 items-center space-x-2 sm:space-x-4">
                                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-3 sm:px-4 py-2 bg-gray-800 rounded disabled:opacity-50">Anterior</button>
                                <span className="text-sm sm:text-base">Página {currentPage} de {totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 sm:px-4 py-2 bg-gray-800 rounded disabled:opacity-50">Próxima</button>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};
// ===================================

const InstallmentModal = memo(({ isOpen, onClose, installments }) => {
    if (!isOpen || !installments || installments.length === 0) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Opções de Parcelamento">
            <div className="space-y-3">
                {installments.map(p => (
                    <div key={p.installments} className="flex justify-between items-center p-3 border border-gray-200 rounded-md transition-colors hover:bg-gray-50">
                        <div>
                            <p className="font-bold text-lg text-gray-800">{p.recommended_message.replace('.', ',')}</p>
                            <p className="text-sm text-gray-500">Total: R$ {p.total_amount.toFixed(2).replace('.', ',')}</p>
                        </div>
                        {p.installment_rate === 0 ? (
                            <span className="text-sm font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full whitespace-nowrap">Sem juros</span>
                        ) : (
                             <span className="text-sm font-semibold text-orange-600 bg-orange-100 px-3 py-1 rounded-full whitespace-nowrap">Com juros</span>
                        )}
                    </div>
                ))}
            </div>
            <p className="text-xs text-gray-500 mt-6 text-center">Você poderá escolher o número de parcelas na hora de fechar a compra.</p>
        </Modal>
    );
});

const ShippingCalculator = memo(({ items: itemsFromProp }) => {
    const { 
        cart,
        addresses, 
        shippingLocation, 
        setShippingLocation,
        shippingOptions,
        isLoadingShipping,
        shippingError,
        autoCalculatedShipping,
        setAutoCalculatedShipping,
        setPreviewShippingItem, // Pega do contexto
        setSelectedShippingName,
        isGeolocating 
    } = useShop();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [manualCep, setManualCep] = useState('');
    const [apiError, setApiError] = useState('');

    useEffect(() => {
        // CORREÇÃO: Define o preview SEMPRE que houver itemsFromProp, ignorando o estado do carrinho.
        // Isso garante que na página de detalhes, o cálculo seja para aquele item.
        if (itemsFromProp && itemsFromProp.length > 0) {
            setPreviewShippingItem(itemsFromProp);
        }
        
        // Limpa ao desmontar
        return () => {
            if (itemsFromProp && itemsFromProp.length > 0) {
                setPreviewShippingItem(null);
            }
        };
    }, [itemsFromProp, setPreviewShippingItem]);
    
    const handleSelectShipping = (option) => {
        setAutoCalculatedShipping(option);
        setSelectedShippingName(option.name);
    };

    const handleSelectAddress = (addr) => {
        setShippingLocation({ cep: addr.cep, city: addr.localidade, state: addr.uf, alias: addr.alias });
        setIsModalOpen(false);
    };

    const handleManualCepSubmit = async (e) => {
        e.preventDefault();
        setApiError('');
        const cleanCep = manualCep.replace(/\D/g, '');
        if (cleanCep.length !== 8) { setApiError("CEP inválido."); return; }
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();
            if (data.erro) { setApiError("CEP não encontrado."); } else {
                setShippingLocation({ cep: manualCep, city: data.localidade, state: data.uf, alias: `CEP ${manualCep}` });
                setIsModalOpen(false);
                setManualCep('');
            }
        } catch { setApiError("Não foi possível buscar o CEP."); }
    };
    
    const handleCepInputChange = (e) => {
        setManualCep(maskCEP(e.target.value));
        if (apiError) setApiError('');
    };

    const getDeliveryDate = (deliveryTime) => {
        if (typeof deliveryTime === 'string') {
             const date = new Date();
             let addedDays = 0;
             while (addedDays < 1) {
                 date.setDate(date.getDate() + 1);
                 if (date.getDay() !== 0 && date.getDay() !== 6) addedDays++;
             }
             const formattedDate = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
             return `Receba até ${formattedDate}. (1 dia útil)`;
        }

        if (!deliveryTime || isNaN(deliveryTime)) return 'Prazo indisponível';
        
        const date = new Date();
        let addedDays = 0;
        while (addedDays < deliveryTime) {
            date.setDate(date.getDate() + 1);
            if (date.getDay() !== 0 && date.getDay() !== 6) addedDays++;
        }
        return `Previsão de entrega para ${date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}`;
    };

    return (
        <>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Alterar Endereço de Entrega" size="md">
                <div className="space-y-4">
                    {addresses && addresses.length > 0 && addresses.map(addr => (
                         <div key={addr.id} onClick={() => handleSelectAddress(addr)} className="p-4 border-2 rounded-lg cursor-pointer transition-all bg-gray-50 hover:border-amber-400 hover:bg-amber-50">
                             <p className="font-bold text-gray-800">{addr.alias}</p>
                             <p className="text-sm text-gray-600">{addr.logradouro}, {addr.numero} - {addr.bairro}</p>
                         </div>
                    ))}
                    <div className="pt-4 border-t">
                        <form onSubmit={handleManualCepSubmit} className="space-y-2">
                             <label className="block text-sm font-medium text-gray-700">Calcular frete para um novo CEP</label>
                             <div className="flex gap-2">
                                <input type="text" value={manualCep} onChange={handleCepInputChange} placeholder="00000-000" className="w-full p-2 border border-gray-300 rounded-md text-gray-900" />
                                <button type="submit" className="bg-gray-800 text-white font-bold px-4 rounded-md hover:bg-black">OK</button>
                             </div>
                             {apiError && <p className="text-red-500 text-xs mt-1">{apiError}</p>}
                        </form>
                    </div>
                </div>
            </Modal>

            <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
                <div className="min-h-[60px]">
                    {shippingLocation.cep.replace(/\D/g, '').length === 8 ? (
                        <>
                            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-4">
                                <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-300">
                                    <MapPinIcon className="h-5 w-5 flex-shrink-0 text-amber-400" />
                                    <span className="truncate">Opções para {shippingLocation.cep}</span>
                                </div>
                                <button onClick={() => setIsModalOpen(true)} className="text-amber-400 hover:underline flex-shrink-0 text-sm font-semibold">
                                    Alterar
                                </button>
                            </div>
                            {isLoadingShipping && <div className="flex items-center gap-2 animate-pulse"><SpinnerIcon className="h-5 w-5 text-amber-400" /><span className="text-gray-400">Calculando...</span></div>}
                            {!isLoadingShipping && shippingError && (<div className="text-red-400 text-sm">{shippingError}</div>)}
                            {!isLoadingShipping && shippingOptions.length > 0 && (
                                <div className="space-y-3">
                                    {shippingOptions.map(option => (
                                        <div key={option.name} onClick={() => handleSelectShipping(option)} className={`flex items-center justify-between p-3 rounded-md border-2 transition-all cursor-pointer ${autoCalculatedShipping?.name === option.name ? 'border-amber-400 bg-amber-900/40' : 'border-gray-700 hover:bg-gray-800'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 flex items-center justify-center">
                                                    <div className={`w-4 h-4 rounded-full border-2 ${autoCalculatedShipping?.name === option.name ? 'border-amber-400' : 'border-gray-500'}`}>
                                                        {autoCalculatedShipping?.name === option.name && <div className="w-full h-full p-0.5"><div className="w-full h-full rounded-full bg-amber-400"></div></div>}
                                                    </div>
                                                </div>
                                                <div className="text-gray-300">{option.isPickup ? <BoxIcon className="h-6 w-6"/> : <TruckIcon className="h-6 w-6"/>}</div>
                                                <div>
                                                    <p className="font-semibold text-white">{option.name}</p>
                                                    <p className="text-xs text-gray-400">
                                                        {option.isPickup ? option.delivery_time : getDeliveryDate(option.delivery_time)}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="font-bold text-lg text-amber-400">{option.price > 0 ? `R$ ${option.price.toFixed(2)}` : 'Grátis'}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!isLoadingShipping && shippingOptions.length === 0 && !shippingError && (
                                <div><p className="text-gray-400 text-sm">Nenhuma opção de entrega encontrada para este CEP.</p></div>
                            )}
                        </>
                    ) : (
                        isGeolocating ? (
                            <div className="flex items-center gap-2 animate-pulse py-4">
                                <SpinnerIcon className="h-5 w-5 text-amber-400" />
                                <span className="text-gray-400 text-sm">Obtendo sua localização para calcular o frete...</span>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm font-medium text-gray-200 mb-2">Calcular frete e prazo</p>
                                <form onSubmit={handleManualCepSubmit} className="flex gap-2">
                                    <input type="text" value={manualCep} onChange={handleCepInputChange} placeholder="Digite seu CEP" className="w-full p-2 bg-gray-800 border-gray-700 border rounded-md text-white"/>
                                    <button type="submit" className="bg-amber-400 text-black font-bold px-4 rounded-md hover:bg-amber-300">Calcular</button>
                                </form>
                                {apiError && <p className="text-red-500 text-xs mt-1">{apiError}</p>}
                            </div>
                        )
                    )}
                </div>
            </div>
        </>
    );
});
const VariationSelector = ({ product, variations, onSelectionChange }) => {
    const [selectedColor, setSelectedColor] = useState('');
    const [selectedSize, setSelectedSize] = useState('');

    const uniqueColors = useMemo(() => {
        const colors = new Map();
        if (!variations || !product) return [];

        variations.forEach(v => {
            if (v.color && !colors.has(v.color)) {
                const primaryImage = (v.images && v.images.length > 0) 
                    ? v.images[0] 
                    : getFirstImage(product.images);
                colors.set(v.color, primaryImage);
            }
        });
        return Array.from(colors, ([name, image]) => ({ name, image }));
    }, [variations, product]);

    const allSizesForColor = useMemo(() => {
        if (!selectedColor) return [];
        const sizeMap = new Map();
        variations
            .filter(v => v.color === selectedColor)
            .forEach(v => {
                const currentStock = sizeMap.get(v.size)?.stock || 0;
                sizeMap.set(v.size, { size: v.size, stock: currentStock + v.stock });
            });
        return Array.from(sizeMap.values());
    }, [variations, selectedColor]);

    useEffect(() => {
        const fullSelection = (selectedColor && selectedSize)
            ? variations.find(v => v.color === selectedColor && v.size === selectedSize)
            : null;
        onSelectionChange(fullSelection, selectedColor);
    }, [selectedColor, selectedSize, variations, onSelectionChange]);

    const handleColorChange = (color) => {
        setSelectedColor(color);
        const sizesForNewColor = variations
            .filter(v => v.color === color && v.stock > 0)
            .map(v => v.size);
        
        if (sizesForNewColor.length === 1) {
            setSelectedSize(sizesForNewColor[0]);
        } else {
            setSelectedSize('');
        }
    };
    
    return (
        <div className="space-y-6">
            <div>
                 <h3 className="text-lg font-semibold text-gray-300 mb-3">Cor: <span className="font-normal">{selectedColor || 'Selecione uma cor'}</span></h3>
                <div className="flex flex-wrap gap-2">
                    {uniqueColors.map(colorInfo => (
                         <div key={colorInfo.name}
                            onClick={() => handleColorChange(colorInfo.name)}
                            className={`p-1 border-2 bg-white rounded-md cursor-pointer transition-all ${selectedColor === colorInfo.name ? 'border-amber-400 scale-105 shadow-lg' : 'border-transparent hover:border-gray-400'}`}
                            title={colorInfo.name}
                        >
                             <img src={colorInfo.image} alt={colorInfo.name} className="w-16 h-16 object-contain"/>
                         </div>
                    ))}
                </div>
            </div>
            {selectedColor && (
                 <div>
                    <h3 className="text-lg font-semibold text-gray-300 mb-3">Tamanho:</h3>
                    <div className="flex flex-wrap gap-3">
                        {allSizesForColor.length > 0 ? (
                            allSizesForColor.map(({ size, stock }) => (
                                <div key={size} className="relative">
                                    <button
                                        key={size}
                                        onClick={() => setSelectedSize(size)}
                                        disabled={stock === 0}
                                        className={`px-5 py-2 border-2 rounded-md font-bold transition-colors duration-200 
                                            ${selectedSize === size ? 'bg-amber-400 text-black border-amber-400' : 'border-gray-600 hover:bg-gray-800 hover:border-gray-500'}
                                            ${stock === 0 ? 'opacity-40 bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed' : ''}`
                                        }
                                    >
                                        {size}
                                    </button>
                                    {stock === 0 && (
                                        <div className="absolute -top-2 -right-2 bg-gray-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold border-2 border-black">
                                            X
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                             <p className="text-gray-500">Nenhum tamanho disponível para esta cor.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const ProductDetailPage = ({ productId, onNavigate }) => {
    const { user } = useAuth();
    const { addToCart, calculateLocalDeliveryPrice, shippingLocation } = useShop(); // Adicionado calculateLocalDeliveryPrice e shippingLocation
    const notification = useNotification();
    const confirmation = useConfirmation();
    const [isLoading, setIsLoading] = useState(true);
    const [product, setProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [crossSellProducts, setCrossSellProducts] = useState([]);
    const [mainImage, setMainImage] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('description');
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
    const [installments, setInstallments] = useState([]);
    const [isLoadingInstallments, setIsLoadingInstallments] = useState(true);
    const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
    const [selectedVariation, setSelectedVariation] = useState(null);
    const [galleryImages, setGalleryImages] = useState([]);
    
    // REMOVIDOS estados do preview de frete que causavam duplicidade
    // const [cardShippingInfo, setCardShippingInfo] = useState(null);
    // const [isCardShippingLoading, setIsCardShippingLoading] = useState(false);
    
    const [timeLeft, setTimeLeft] = useState('');
    const [isPromoActive, setIsPromoActive] = useState(false);

    const galleryRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const productImages = useMemo(() => parseJsonString(product?.images, []), [product]);
    const productVariations = useMemo(() => parseJsonString(product?.variations, []), [product]);

    useEffect(() => {
        if (product) {
            let active = !!product.is_on_sale && product.sale_price > 0;
            if (product.product_type === 'clothing' && selectedVariation) {
                if (selectedVariation.is_promo === false) {
                    active = false;
                }
            }
            setIsPromoActive(active);
        }
    }, [product, selectedVariation]);

    const currentPrice = isPromoActive ? product.sale_price : product?.price;

    const discountPercent = useMemo(() => {
        if (isPromoActive && product) {
            return Math.round(((product.price - product.sale_price) / product.price) * 100);
        }
        return 0;
    }, [isPromoActive, product]);

    useEffect(() => {
        if (!product?.sale_end_date) {
            setTimeLeft(null);
            return;
        }
        if (!isPromoActive) {
             setTimeLeft(null);
             return;
        }

        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const endDate = new Date(product.sale_end_date).getTime();
            const difference = endDate - now;
            
            if (difference > 0) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((difference % (1000 * 60)) / 1000);

                setTimeLeft({ days, hours, minutes, seconds });
            } else {
                setTimeLeft('Expirada');
                setIsPromoActive(false); 
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [isPromoActive, product?.sale_end_date]);

    // --- REMOVIDO EFEITO DE CÁLCULO DE FRETE (PREVIEW) ---
    // O useEffect que calculava o cardShippingInfo foi removido para eliminar a duplicidade.

    const isNew = useMemo(() => {
        if (!product || !product.created_at) return false;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return new Date(product.created_at) > thirtyDaysAgo;
    }, [product]);

    const avgRating = useMemo(() => {
        return reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length || 0;
    }, [reviews]);

    const itemsForShipping = useMemo(() => {
        if (!product) return [];
        return [{...product, qty: quantity}];
    }, [product, quantity]);

    const isClothing = product?.product_type === 'clothing';
    const isPerfume = product?.product_type === 'perfume';
    const isProductOutOfStock = product?.stock <= 0;
    const stockLimit = isClothing ? selectedVariation?.stock : product?.stock;
    const isQtyAtMax = stockLimit !== undefined ? quantity >= stockLimit : false;

    const getYouTubeEmbedUrl = (url) => {
        if (!url) return null;
        let videoId;
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname === 'youtu.be') {
                videoId = urlObj.pathname.slice(1);
            } else if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
                videoId = urlObj.searchParams.get('v');
            } else { return null; }
            return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
        } catch (e) {
            console.error("URL do YouTube inválida:", e);
            return null;
        }
    };

    const parseTextToList = (text) => {
        if (!text || text.trim() === '') return null;
        return <ul className="space-y-1">{text.split('\n').map((line, index) => <li key={index} className="flex items-start"><span className="text-amber-400 mr-2 mt-1 text-xs">&#10003;</span><span>{line}</span></li>)}</ul>;
    };

    const getInstallmentSummary = () => {
        if (isLoadingInstallments) { return <div className="h-4 bg-gray-700 rounded w-3/4 animate-pulse"></div>; }
        if (!installments || installments.length === 0) { return <span className="text-gray-500 text-xs">Parcelamento indisponível.</span>; }
        const noInterest = [...installments].reverse().find(p => p.installment_rate === 0);
        if (noInterest) { return <span className="text-xs">em até <span className="font-bold">{noInterest.installments}x de R$&nbsp;{noInterest.installment_amount.toFixed(2).replace('.', ',')}</span> sem juros</span>; }
        const lastInstallment = installments[installments.length - 1];
        if (lastInstallment) { return <span className="text-xs">ou em até <span className="font-bold">{lastInstallment.installments}x de R$&nbsp;{lastInstallment.installment_amount.toFixed(2).replace('.', ',')}</span></span>; }
        return null;
    };

    const fetchProductData = useCallback(async (id) => {
        const controller = new AbortController();
        const signal = controller.signal;
        setIsLoading(true);
        try {
            const [productData, reviewsData, allProductsData, crossSellData] = await Promise.all([
                apiService(`/products/${id}`, 'GET', null, { signal }),
                apiService(`/products/${id}/reviews`, 'GET', null, { signal }),
                apiService('/products', 'GET', null, { signal }),
                apiService(`/products/${id}/related-by-purchase`, 'GET', null, { signal }).catch(() => [])
            ]);

            if (signal.aborted) return;

            const images = parseJsonString(productData.images, ['https://placehold.co/600x400/222/fff?text=Produto']);
            setMainImage(images[0] || 'https://placehold.co/600x400/222/fff?text=Produto');
            setGalleryImages(images);
            setProduct(productData);
            setReviews(Array.isArray(reviewsData) ? reviewsData : []);
            setCrossSellProducts(Array.isArray(crossSellData) ? crossSellData : []);

            if (productData && allProductsData) {
                const related = allProductsData.filter(p => p.id !== productData.id && (p.brand === productData.brand || p.category === productData.category)).slice(0, 8);
                setRelatedProducts(related);
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                 console.error("Falha ao buscar dados do produto:", err);
                 setProduct({ error: true, message: "Produto não encontrado ou ocorreu um erro." });
                 notification.show(err.message || "Produto não encontrado", 'error');
            }
        } finally {
            if (!signal.aborted) { setIsLoading(false); }
        }
        return () => { controller.abort(); };
    }, [notification]);

    const handleDeleteReview = (reviewId) => {
        confirmation.show("Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.", async () => {
            try {
                await apiService(`/reviews/${reviewId}`, 'DELETE');
                notification.show('Avaliação excluída com sucesso.');
                fetchProductData(productId);
            } catch (error) {
                notification.show(`Erro ao excluir avaliação: ${error.message}`, 'error');
            }
        });
    };

    const handleShare = async () => {
        const shareText = `✨ Olha o que eu encontrei na Love Cestas e Perfumes!\n\n*${product.name}*\n\nConfira mais detalhes no site 👇`;
        const shareData = { title: `Love Cestas e Perfumes - ${product.name}`, text: shareText, url: window.location.href };
        if (navigator.share) {
            try { await navigator.share(shareData); } catch (err) { if (err.name !== 'AbortError') { notification.show('Compartilhamento cancelado.', 'error'); } }
        } else {
            try { await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`); notification.show('Link do produto copiado!'); } catch (err) { notification.show('Não foi possível copiar o link.', 'error'); }
        }
    };

    const handleQuantityChange = (amount) => {
        setQuantity(prev => {
            const newQty = prev + amount;
            if (newQty < 1) return 1;
            const currentStockLimit = isClothing ? selectedVariation?.stock : product?.stock;
            if (currentStockLimit !== undefined && newQty > currentStockLimit) {
                 notification.show(`Apenas ${currentStockLimit} unidades disponíveis.`, 'error');
                 return currentStockLimit;
            }
            return newQty;
        });
    };

    const handleAction = async (action) => {
        if (!product) return;
        if (isClothing && !selectedVariation) { notification.show("Por favor, selecione uma cor e um tamanho.", "error"); return; }
        try {
            await addToCart(product, quantity, selectedVariation);
            notification.show(`${quantity}x ${product.name} adicionado(s) ao carrinho!`);
            if (action === 'buyNow') { onNavigate('cart'); }
        } catch (error) { notification.show(error.message, 'error'); }
    };

    const handleVariationSelection = useCallback((variation, color) => {
        setQuantity(1);
        setSelectedVariation(variation);
        if (color && productVariations.length > 0) {
            const allImagesForColor = productVariations
                .filter(v => v.color === color && v.images && v.images.length > 0)
                .flatMap(v => v.images)
                .filter((value, index, self) => self.indexOf(value) === index);

            if (allImagesForColor.length > 0) {
                setGalleryImages(allImagesForColor);
                setMainImage(allImagesForColor[0]);
                return;
            }
        }
        setGalleryImages(productImages);
        setMainImage(productImages[0] || 'https://placehold.co/600x400/222/fff?text=Produto');

    }, [productVariations, productImages]);

    useEffect(() => {
        fetchProductData(productId);
        window.scrollTo(0, 0);
    }, [productId, fetchProductData]);

    useEffect(() => {
        const fetchInstallments = async (price) => {
            if (!price || price <= 0) {
                setInstallments([]);
                setIsLoadingInstallments(false);
                return;
            }
            setIsLoadingInstallments(true);
            setInstallments([]);
            try {
                const installmentData = await apiService(`/mercadopago/installments?amount=${price}`);
                setInstallments(installmentData || []);
            } catch (error) {
                console.warn("Não foi possível carregar as opções de parcelamento.", error);
                setInstallments([]);
            } finally {
                setIsLoadingInstallments(false);
            }
        };
        if (product && !product.error && currentPrice > 0) {
            fetchInstallments(currentPrice);
        } else if (!product || product.error || !(currentPrice > 0)) {
             setInstallments([]);
             setIsLoadingInstallments(false);
        }
    }, [product, currentPrice]);

    const checkScrollButtons = useCallback(() => {
        const gallery = galleryRef.current;
        if (gallery) {
            setCanScrollLeft(gallery.scrollLeft > 0);
            setCanScrollRight(gallery.scrollWidth > gallery.clientWidth + gallery.scrollLeft + 1);
        }
    }, []);

    useEffect(() => {
        checkScrollButtons();
        const gallery = galleryRef.current;
        if (gallery) {
            gallery.addEventListener('scroll', checkScrollButtons);
            window.addEventListener('resize', checkScrollButtons);
            return () => {
                gallery.removeEventListener('scroll', checkScrollButtons);
                window.removeEventListener('resize', checkScrollButtons);
            };
        }
    }, [galleryImages, checkScrollButtons]);

    const scrollGallery = (direction) => {
        const gallery = galleryRef.current;
        if (gallery) {
            const scrollAmount = gallery.clientWidth * 0.7;
            gallery.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const TabButton = ({ label, tabName, isVisible = true }) => {
        if (!isVisible) return null;
        return (
            <button onClick={() => setActiveTab(tabName)} className={`px-5 py-3 text-sm font-semibold transition-colors duration-200 border-b-2 ${activeTab === tabName ? 'border-amber-400 text-white' : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600'}`} > {label} </button>
        );
    };

    const Lightbox = ({ mainImage, onClose }) => (
        <div className="fixed inset-0 bg-black/90 z-[999] flex items-center justify-center p-4" onClick={onClose}>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-4 right-4 text-white text-5xl leading-none z-[1000] p-2">&times;</button>
            <div className="relative w-full h-full max-w-5xl max-h-[90vh] flex items-center justify-center" onClick={e => e.stopPropagation()}><img src={mainImage} alt="Imagem ampliada" className="max-w-full max-h-full object-contain rounded-lg" /></div>
        </div>
    );

    if (isLoading) return <div className="text-white text-center py-20 bg-black min-h-screen">Carregando...</div>;
    if (product?.error) return <div className="text-white text-center py-20 bg-black min-h-screen">{product.message}</div>;
    if (!product) return <div className="bg-black min-h-screen"></div>;

    const currentStockStatus = isClothing ? selectedVariation?.stock : product?.stock;
    const productOrVariationOutOfStock = currentStockStatus <= 0;

    const showGalleryArrows = galleryImages.length + (product.video_url ? 1 : 0) > 4;

    return (
        <div className="bg-black text-white min-h-screen">
            <InstallmentModal isOpen={isInstallmentModalOpen} onClose={() => setIsInstallmentModalOpen(false)} installments={installments}/>
            {isLightboxOpen && galleryImages.length > 0 && ( <Lightbox mainImage={mainImage} onClose={() => setIsLightboxOpen(false)} /> )}
            <AnimatePresence>
                {isVideoModalOpen && product.video_url && (
                     <Modal isOpen={true} onClose={() => setIsVideoModalOpen(false)} title="Vídeo do Produto" size="2xl">
                        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, backgroundColor: 'black' }}>
                            <iframe src={getYouTubeEmbedUrl(product.video_url)} title={product.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}></iframe>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            <div className="container mx-auto px-4 py-8 lg:py-12">
                <div className="mb-6">
                    <button onClick={() => onNavigate('products')} className="text-sm text-amber-400 hover:underline flex items-center w-fit transition-colors"> <ArrowUturnLeftIcon className="h-4 w-4 mr-1.5"/> Voltar para todos os produtos </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
                    <div className="lg:sticky lg:top-24 self-start">
                        <div onClick={() => galleryImages.length > 0 && setIsLightboxOpen(true)} className={`aspect-square bg-white rounded-lg flex items-center justify-center relative mb-4 shadow-lg overflow-hidden group ${galleryImages.length > 0 ? 'cursor-zoom-in' : ''}`}>
                             {!productOrVariationOutOfStock && ( <div className="absolute top-3 left-3 flex flex-col gap-2 z-10"> {isPromoActive ? ( <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5"> <SaleIcon className="h-4 w-4"/> <span>PROMOÇÃO {discountPercent}%</span> </div> ) : isNew ? ( <div className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">LANÇAMENTO</div> ) : null} </div> )}
                             {productOrVariationOutOfStock && ( <div className="absolute top-3 left-3 bg-gray-700 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg z-10">ESGOTADO</div> )}
                            <img src={mainImage} alt={product.name} className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105" />
                        </div>

                        <div className="relative group">
                            <div
                                ref={galleryRef}
                                className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
                                style={{
                                    msOverflowStyle: 'none', 
                                    scrollbarWidth: 'none' 
                                }}
                            >
                                <style>{` .scrollbar-hide::-webkit-scrollbar { display: none; } `}</style>

                               {product.video_url && (
                                    <div onClick={() => setIsVideoModalOpen(true)} className="w-20 h-20 flex-shrink-0 bg-black p-1 rounded-md cursor-pointer border-2 border-transparent hover:border-amber-400 relative flex items-center justify-center transition-colors">
                                        <img src={galleryImages[0] || getFirstImage(product.images)} alt="Vídeo do produto" className="w-full h-full object-contain filter blur-sm opacity-50"/>
                                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                                            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
                                        </div>
                                    </div>
                                )}
                                {galleryImages.map((img, index) => (
                                    <div
                                        key={index}
                                        onClick={() => setMainImage(img)}
                                        onMouseEnter={() => setMainImage(img)}
                                        className={`w-20 h-20 flex-shrink-0 bg-white p-1 rounded-md cursor-pointer border-2 transition-all duration-150 ${mainImage === img ? 'border-amber-400' : 'border-transparent hover:border-gray-400'}`}
                                    >
                                        <img src={img} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-contain" />
                                    </div>
                                ))}
                            </div>
                            {showGalleryArrows && (
                                <>
                                    <button onClick={() => scrollGallery('left')} disabled={!canScrollLeft} className={`absolute top-1/2 left-0 transform -translate-y-1/2 -ml-3 z-10 p-2 bg-gray-800/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-gray-700 disabled:opacity-0 disabled:cursor-default`} aria-label="Scroll Left">
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                     <button onClick={() => scrollGallery('right')} disabled={!canScrollRight} className={`absolute top-1/2 right-0 transform -translate-y-1/2 -mr-3 z-10 p-2 bg-gray-800/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-gray-700 disabled:opacity-0 disabled:cursor-default`} aria-label="Scroll Right">
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <p className="text-sm text-amber-400 font-semibold tracking-wider mb-1">{product.brand.toUpperCase()}</p>
                            <h1 className="text-2xl lg:text-3xl font-bold mb-1.5">{product.name}</h1>
                            {isPerfume && product.volume && <h2 className="text-base font-light text-gray-400">{String(product.volume).toLowerCase().includes('ml') ? product.volume : `${product.volume}ml`}</h2>}
                            <div className="flex items-center mt-2 justify-between">
                                <div className="flex items-center gap-1.5">
                                    <div className="flex items-center gap-0.5">{[...Array(5)].map((_, i) => <StarIcon key={i} className={`h-4 w-4 ${i < Math.round(avgRating) ? 'text-amber-400' : 'text-gray-600'}`} isFilled={i < Math.round(avgRating)} />)}</div>
                                    {reviews.length > 0 && <span className="text-xs text-gray-500">({reviews.length} avaliações)</span>}
                                    {reviews.length === 0 && <span className="text-xs text-gray-500">Seja o primeiro a avaliar</span>}
                                </div>
                                <button onClick={handleShare} className="flex items-center gap-1.5 text-gray-400 hover:text-amber-400 transition-colors p-1 rounded-md text-sm"> <ShareIcon className="h-4 w-4"/> <span className="hidden sm:inline">Compartilhar</span> </button>
                            </div>
                        </div>

                        {/* REMOVIDO o bloco de exibição duplicada do frete que estava aqui */}

                        {isPromoActive && timeLeft && timeLeft !== 'Expirada' && (
                            <div className="bg-gradient-to-br from-red-900/40 to-black border border-red-800 rounded-lg p-4 mb-4 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                                    <ClockIcon className="h-24 w-24 text-red-500" />
                                </div>
                                <div className="flex items-center justify-center sm:justify-start gap-2 mb-3 text-red-400 font-bold uppercase tracking-wide text-xs sm:text-sm">
                                    <SparklesIcon className="h-4 w-4 animate-pulse" />
                                    Oferta por Tempo Limitado
                                </div>
                                
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 w-full">
                                    <div className="text-white font-mono text-lg sm:text-2xl font-bold flex justify-center gap-2 w-full sm:w-auto">
                                        <div className="bg-black/50 px-2 py-1 rounded border border-red-900/50 flex flex-col items-center min-w-[45px] sm:min-w-[50px]">
                                            <span>{String(timeLeft.days).padStart(2, '0')}</span>
                                            <span className="text-[9px] sm:text-[10px] font-sans font-normal text-gray-400">DIAS</span>
                                        </div>
                                        <span className="self-center text-red-500">:</span>
                                        <div className="bg-black/50 px-2 py-1 rounded border border-red-900/50 flex flex-col items-center min-w-[45px] sm:min-w-[50px]">
                                            <span>{String(timeLeft.hours).padStart(2, '0')}</span>
                                            <span className="text-[9px] sm:text-[10px] font-sans font-normal text-gray-400">HORAS</span>
                                        </div>
                                        <span className="self-center text-red-500">:</span>
                                        <div className="bg-black/50 px-2 py-1 rounded border border-red-900/50 flex flex-col items-center min-w-[45px] sm:min-w-[50px]">
                                            <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
                                            <span className="text-[9px] sm:text-[10px] font-sans font-normal text-gray-400">MIN</span>
                                        </div>
                                        <span className="self-center text-red-500">:</span>
                                        <div className="bg-black/50 px-2 py-1 rounded border border-red-900/50 flex flex-col items-center min-w-[45px] sm:min-w-[50px]">
                                            <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
                                            <span className="text-[9px] sm:text-[10px] font-sans font-normal text-gray-400">SEG</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center sm:items-end w-full sm:w-auto border-t sm:border-t-0 border-red-900/30 pt-3 sm:pt-0 mt-1 sm:mt-0">
                                        <p className="text-gray-400 text-sm">De: <span className="line-through">R$ {Number(product.price).toFixed(2).replace('.', ',')}</span></p>
                                        <div className="flex items-center justify-center sm:justify-end gap-2">
                                            <p className="text-white font-bold text-xl">Por: <span className="text-amber-400">R$ {Number(product.sale_price).toFixed(2).replace('.', ',')}</span></p>
                                        </div>
                                        <p className="text-xs text-green-400 font-semibold mt-1 bg-green-900/20 px-3 py-0.5 rounded-full inline-block">Economize {discountPercent}%</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isPromoActive && (!timeLeft || timeLeft === 'Expirada') && (
                             <div className="bg-gradient-to-br from-green-900/40 to-black border border-green-800 rounded-lg p-4 mb-4 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                                    <TagIcon className="h-24 w-24 text-green-500" />
                                </div>
                                <div className="flex items-center gap-2 mb-2 text-green-400 font-bold uppercase tracking-wide text-sm">
                                    <SaleIcon className="h-5 w-5" />
                                    Preço Especial
                                </div>
                                <div className="flex items-center justify-between relative z-10">
                                    <div>
                                        <p className="text-gray-400 text-sm">De: <span className="line-through">R$ {Number(product.price).toFixed(2).replace('.', ',')}</span></p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-white font-bold text-2xl">Por: <span className="text-green-400">R$ {Number(product.sale_price).toFixed(2).replace('.', ',')}</span></p>
                                        </div>
                                    </div>
                                    <div className="bg-green-600 text-white font-bold px-3 py-1 rounded-full text-sm shadow-lg">
                                        -{discountPercent}%
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="border-t border-b border-gray-800 py-4">
                            {isPromoActive ? (
                                <div className="flex items-center gap-3">
                                    <p className="text-4xl font-bold text-red-500">R$ {Number(product.sale_price).toFixed(2).replace('.',',')}</p>
                                    {!timeLeft && <span className="text-sm font-bold text-green-500 bg-green-900/50 px-2 py-0.5 rounded-md">{discountPercent}% OFF</span>}
                                </div>
                             ) : ( <p className="text-3xl font-bold text-white">R$ {Number(product.price).toFixed(2).replace('.',',')}</p> )}
                            <div className="mt-2 flex items-center gap-2 text-sm text-gray-300">
                                <CreditCardIcon className="h-5 w-5 text-amber-400 flex-shrink-0" />
                                <span>{getInstallmentSummary()}</span>
                                {!isLoadingInstallments && installments && installments.length > 0 && ( <button onClick={() => setIsInstallmentModalOpen(true)} className="text-amber-400 font-semibold hover:underline text-xs ml-2"> (ver mais)</button> )}
                            </div>
                        </div>

                        {isClothing && ( <VariationSelector product={product} variations={productVariations} onSelectionChange={handleVariationSelection} /> )}

                        {!productOrVariationOutOfStock && (
                            <div className="flex items-center space-x-4">
                                <p className="font-semibold text-sm">Quantidade:</p>
                                <div className="flex items-center border border-gray-700 rounded-md overflow-hidden">
                                    <button onClick={() => handleQuantityChange(-1)} className="px-3 py-1.5 text-lg hover:bg-gray-800 transition-colors">-</button>
                                    <span className="px-4 py-1.5 font-bold text-base border-x border-gray-700">{quantity}</span>
                                    <button onClick={() => handleQuantityChange(1)} disabled={isQtyAtMax} className="px-3 py-1.5 text-lg hover:bg-gray-800 transition-colors disabled:text-gray-600 disabled:cursor-not-allowed disabled:hover:bg-transparent">+</button>
                                </div>
                                {stockLimit !== undefined && <span className="text-xs text-gray-500">({stockLimit} unid. disponíveis)</span>}
                                {isQtyAtMax && <span className="text-xs text-red-400">Limite atingido</span>}
                            </div>
                        )}

                        <div className="space-y-3 pt-2">
                            {productOrVariationOutOfStock ? ( <div className="w-full bg-gray-700 text-gray-400 py-3 rounded-md text-base text-center font-bold"> {isClothing && selectedVariation ? 'Variação Esgotada' : 'Produto Esgotado'} </div> ) : ( <> <button onClick={() => handleAction('buyNow')} className="w-full bg-amber-400 text-black py-3.5 rounded-md text-base hover:bg-amber-300 transition font-bold disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg" disabled={isClothing && !selectedVariation} > Comprar Agora </button> <button onClick={() => handleAction('addToCart')} className="w-full bg-gray-800 border border-gray-700 text-white py-3 rounded-md text-base hover:bg-gray-700 transition font-bold disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow hover:shadow-md" disabled={isClothing && !selectedVariation} > <CartIcon className="h-5 w-5" /> Adicionar ao Carrinho </button> </> )}
                        </div>

                        <ShippingCalculator items={itemsForShipping} />
                    </div>
                </div>

                <div className="mt-16 lg:mt-24 pt-10 border-t border-gray-800">
                    <div className="flex justify-center border-b border-gray-800 mb-8 flex-wrap -mt-3">
                        <TabButton label="Descrição" tabName="description" />
                        <TabButton label="Notas Olfativas" tabName="notes" isVisible={isPerfume} />
                        <TabButton label="Como Usar" tabName="how_to_use" isVisible={isPerfume} />
                        <TabButton label="Ideal Para" tabName="ideal_for" isVisible={isPerfume} />
                        <TabButton label="Guia de Medidas" tabName="size_guide" isVisible={isClothing} />
                        <TabButton label="Cuidados com a Peça" tabName="care" isVisible={isClothing} />
                    </div>
                    <div className="text-gray-300 leading-relaxed max-w-3xl mx-auto min-h-[100px] prose prose-invert prose-sm sm:prose-base prose-li:my-1 prose-p:my-2">
                        {activeTab === 'description' && <p>{product.description || 'Descrição não disponível.'}</p>}
                        {isPerfume && activeTab === 'notes' && (product.notes ? parseTextToList(product.notes) : <p>Notas olfativas não disponíveis.</p>)}
                        {isPerfume && activeTab === 'how_to_use' && <p>{product.how_to_use || 'Instruções de uso não disponíveis.'}</p>}
                        {isPerfume && activeTab === 'ideal_for' && (product.ideal_for ? parseTextToList(product.ideal_for) : <p>Informação não disponível.</p>)}
                        {isClothing && activeTab === 'size_guide' && (product.size_guide ? <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: product.size_guide }}/> : <p>Guia de medidas não disponível.</p>)}
                        {isClothing && activeTab === 'care' && (product.care_instructions ? parseTextToList(product.care_instructions) : <p>Instruções de cuidado não disponíveis.</p>)}
                    </div>
                </div>

                {crossSellProducts.length > 0 && ( <div className="mt-16 pt-10 border-t border-gray-800"><ProductCarousel products={crossSellProducts} onNavigate={onNavigate} title="Quem comprou, levou também" /></div> )}
                {relatedProducts.length > 0 && ( <div className="mt-16 pt-10 border-t border-gray-800"><ProductCarousel products={relatedProducts} onNavigate={onNavigate} title="Pode também gostar de..." /></div> )}

                <div className="mt-16 pt-10 border-t border-gray-800 max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold mb-8 text-center">Avaliações de Clientes</h2>
                    <div className="space-y-8 mb-10">
                      {reviews.length > 0 ? reviews.map((review) => (
                            <div key={review.id} className="border-b border-gray-800 pb-6 last:border-b-0 last:pb-0 relative group">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 flex-shrink-0">
                                        <UserIcon className="h-5 w-5" />
                                    </div>
                                    <span className="font-semibold text-white text-sm">{review.user_name || 'Cliente'}</span>
                                     {user && user.role === 'admin' && (
                                        <button
                                            onClick={() => handleDeleteReview(review.id)}
                                            className="absolute top-0 right-0 p-1 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Excluir avaliação"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex">{[...Array(5)].map((_, j) => <StarIcon key={j} className={`h-5 w-5 ${j < review.rating ? 'text-amber-400' : 'text-gray-600'}`} isFilled={j < review.rating}/>)}</div>
                                    {review.comment && review.comment.length > 30 && <span className="font-bold text-white text-sm ml-2 truncate">{review.comment.substring(0, 30)}...</span>}
                                </div>
                                <p className="text-xs text-gray-500 mb-2">
                                    Avaliado no Brasil em {new Date(review.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                                <p className="text-xs font-semibold text-amber-500 mb-3">Compra verificada</p>
                                {review.comment && <p className="text-gray-300 text-sm leading-relaxed break-words">{review.comment}</p>}
                            </div>
                        )) : <p className="text-gray-500 text-center mb-8">Este produto ainda não possui avaliações.</p>}
                    </div>

                    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-center shadow">
                        <h3 className="font-semibold text-white mb-2">Comprou este produto?</h3>
                        <p className="text-gray-400 text-sm mb-4">Compartilhe sua opinião para ajudar outros clientes!</p>
                        <p className="text-xs text-gray-500">Você pode avaliar os produtos comprados na seção <a href="#account/orders" onClick={(e) => {e.preventDefault(); onNavigate('account/orders')}} className="text-amber-400 underline hover:text-amber-300">Meus Pedidos</a>.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LoginPage = ({ onNavigate, redirectPath }) => { // Recebe redirectPath
    const { login, setUser } = useAuth();
    const notification = useNotification();

    // Estados do formulário
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    // Estados para o fluxo 2FA
    const [isTwoFactorStep, setIsTwoFactorStep] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [tempAuthToken, setTempAuthToken] = useState('');

    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    
    // --- Lógica de Navegação Pós-Login ---
    const handleSuccessRedirect = () => {
        if (redirectPath) {
            // Se houver um caminho salvo (ex: link do WhatsApp), vai para ele
            onNavigate(redirectPath);
        } else {
            // Caso contrário, vai para a home
            onNavigate('home');
        }
    };

   const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const response = await login(email, password);

            if (response.twoFactorEnabled) {
                setTempAuthToken(response.token);
                setIsTwoFactorStep(true);
            } else {
                notification.show('Login bem-sucedido!');
                handleSuccessRedirect(); // Usa a nova função de redirecionamento
            }
        } catch (err) {
            setError(err.message || "Ocorreu um erro desconhecido.");
            notification.show(err.message || "Ocorreu um erro desconhecido.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTwoFactorSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const response = await apiService('/login/2fa/verify', 'POST', { token: twoFactorCode, tempAuthToken });
            const { user } = response;

            setUser(user);
            localStorage.setItem('user', JSON.stringify(user));

            notification.show('Login bem-sucedido!');
            handleSuccessRedirect(); // Usa a nova função de redirecionamento

        } catch (err) {
            setError(err.message || "Código 2FA inválido ou expirado.");
            notification.show(err.message || "Código 2FA inválido.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        // --- CORREÇÃO DE LAYOUT MOBILE ---
        // Alterado de 'min-h-screen' para 'min-h-[calc(100vh-4rem)]'
        // Isso desconta a altura do Header (4rem/64px) para centralizar perfeitamente na área visível
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-black p-4 sm:p-6"> 
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="w-full max-w-sm sm:max-w-md bg-gray-900 text-white p-6 sm:p-8 rounded-lg shadow-lg border border-gray-800" 
            >
                {error && <p className="text-red-400 text-center mb-4 bg-red-900/50 p-3 rounded-md text-sm">{error}</p>}
                
                {/* --- AVISO DE REDIRECIONAMENTO --- */}
                {redirectPath && !isTwoFactorStep && (
                    <div className="mb-6 p-3 bg-amber-900/40 border border-amber-600 rounded-md flex items-center gap-3">
                        <ExclamationCircleIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
                        <p className="text-xs text-amber-200">
                            Faça login para acessar os detalhes do pedido ou a página solicitada.
                        </p>
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {!isTwoFactorStep ? (
                        <motion.div key="login-form" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
                            <div className="text-center mb-6">
                                <div className="mx-auto mb-3 inline-block w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center"> 
                                  <img src="https://res.cloudinary.com/dvflxuxh3/image/upload/v1752292990/uqw1twmffseqafkiet0t.png" alt="Logo" className="w-full h-full object-contain" />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-amber-400">Bem-vindo de Volta</h2>
                            </div>
                            <form onSubmit={handleLogin} className="space-y-5"> 
                                <div>
                                    <label className="text-xs sm:text-sm font-medium text-gray-400 mb-1 block">Email</label>
                                    <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 text-sm sm:text-base" />
                                </div>
                                <div>
                                    <label className="text-xs sm:text-sm font-medium text-gray-400 mb-1 block">Senha</label>
                                    <div className="relative">
                                        <input type={isPasswordVisible ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 pr-10 text-sm sm:text-base" />
                                       <button type="button" onClick={() => setIsPasswordVisible(v => !v)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-amber-400">
                                            {isPasswordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                                        </button>
                                    </div>
                                </div>
                                <button type="submit" disabled={isLoading} className="w-full py-2.5 sm:py-3 px-4 bg-amber-400 text-black font-bold rounded-md hover:bg-amber-300 transition flex justify-center items-center disabled:opacity-60 text-base sm:text-lg">
                                     {isLoading ? <SpinnerIcon /> : 'Entrar'}
                                </button>
                            </form>
                             <div className="text-center mt-5 text-xs sm:text-sm">
                                <p className="text-gray-400">Não tem uma conta?{' '}<a href="#register" onClick={(e) => {e.preventDefault(); onNavigate('register')}} className="font-semibold text-amber-400 hover:underline">Registre-se</a></p>
                                <a href="#forgot-password" onClick={(e) => {e.preventDefault(); onNavigate('forgot-password')}} className="text-gray-500 hover:underline mt-2 inline-block">Esqueceu sua senha?</a>
                            </div>
                        </motion.div>
                    ) : ( 
                        <motion.div key="2fa-form" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                            <div className="text-center mb-6">
                                <div className="mx-auto mb-4 inline-block rounded-full bg-gray-800 p-4 border border-gray-700"><CheckBadgeIcon className="h-8 w-8 text-amber-400" /></div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-amber-400">Verificação de Dois Fatores</h2>
                                <p className="text-gray-400 mt-2 text-sm sm:text-base">Insira o código do seu aplicativo autenticador.</p>
                            </div>
                            <form onSubmit={handleTwoFactorSubmit} className="space-y-6">
                                <div>
                                    <label className="text-xs sm:text-sm font-medium text-gray-400 mb-1 block">Código de 6 dígitos</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="\d{6}"
                                        maxLength="6"
                                        placeholder="123456"
                                        value={twoFactorCode}
                                        onChange={e => setTwoFactorCode(e.target.value)}
                                        required
                                        className="w-full text-center tracking-[0.5em] sm:tracking-[1em] px-4 py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 text-xl sm:text-2xl font-mono" />
                                </div>
                                <button type="submit" disabled={isLoading} className="w-full py-2.5 sm:py-3 px-4 bg-amber-400 text-black font-bold rounded-md hover:bg-amber-300 transition flex justify-center items-center disabled:opacity-60 text-base sm:text-lg">
                                     {isLoading ? <SpinnerIcon /> : 'Verificar'}
                                </button>
                            </form>
                             <div className="text-center mt-6 text-xs sm:text-sm">
                                <button onClick={() => { setIsTwoFactorStep(false); setError(''); }} className="text-gray-500 hover:underline">Voltar</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

const RegisterPage = ({ onNavigate }) => {
    const { register } = useAuth();
    const notification = useNotification();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); 
    const [cpf, setCpf] = useState('');
    const [phone, setPhone] = useState(''); 
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    // Helper para calcular força da senha
    const getPasswordStrength = (pass) => {
        if (!pass) return { label: '', color: '' };
        if (pass.length < 6) return { label: 'Fraca (mín. 6)', color: 'text-red-500' };
        if (pass.length < 8) return { label: 'Média', color: 'text-yellow-500' };
        return { label: 'Forte', color: 'text-green-500' };
    };

    const passStrength = getPasswordStrength(password);
    const passwordsMatch = password === confirmPassword;
    const showMismatch = confirmPassword.length > 0 && !passwordsMatch;

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        
        if (password.length < 6) {
             setError("A senha é muito fraca. Deve ter pelo menos 6 caracteres.");
             return;
        }
        
        if (!passwordsMatch) {
             setError("As senhas não coincidem. Por favor, verifique.");
             return;
        }

        if (!validateCPF(cpf)) {
            setError("O CPF informado é inválido.");
            return;
        }
        if (!validatePhone(phone)) {
            setError("O número de celular informado é inválido.");
            return;
        }

        setIsLoading(true);
        try {
            await register(name, email, password, cpf, phone); 
            notification.show("Usuário registrado com sucesso! Você já pode fazer o login.");
            setTimeout(() => onNavigate('login'), 2000);
        } catch (err) {
            setError(err.message);
            notification.show(err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCpfChange = (e) => {
        setCpf(maskCPF(e.target.value));
    };

    const handlePhoneChange = (e) => {
        setPhone(maskPhone(e.target.value));
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4 sm:p-6">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="w-full max-w-sm sm:max-w-md bg-gray-900 text-white p-6 sm:p-8 rounded-lg shadow-lg border border-gray-800"
            >
                <motion.div variants={itemVariants} className="text-center mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-amber-400">Crie Sua Conta</h2>
                    <p className="text-gray-400 mt-2 text-sm sm:text-base">É rápido e fácil.</p>
                </motion.div>

                {error && <p className="text-red-400 text-center mb-4 bg-red-900/50 p-3 rounded-md text-sm font-bold border border-red-800">{error}</p>}
                
                <motion.form variants={itemVariants} onSubmit={handleRegister} className="space-y-4">
                    <input type="text" placeholder="Nome Completo" value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all text-sm sm:text-base" />
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all text-sm sm:text-base" />
                    <input type="text" placeholder="CPF" value={cpf} onChange={handleCpfChange} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all text-sm sm:text-base" />
                    
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Celular / WhatsApp" 
                            value={phone} 
                            onChange={handlePhoneChange} 
                            required 
                            className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all pl-10 text-sm sm:text-base" 
                        />
                        <WhatsappIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>

                    <div className="relative">
                        <input
                            type={isPasswordVisible ? 'text' : 'password'}
                            placeholder="Senha (mín. 6 caracteres)"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all pr-10 text-sm sm:text-base"
                        />
                        <button
                            type="button"
                            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                            className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-amber-400"
                        >
                            {isPasswordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                        </button>
                    </div>

                    {/* Campo Repetir Senha + Feedbacks */}
                    <div>
                        <div className="relative">
                            <input
                                type={isConfirmPasswordVisible ? 'text' : 'password'}
                                placeholder="Repita a Senha"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                                className={`w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border rounded-md focus:outline-none focus:ring-1 transition-all pr-10 text-sm sm:text-base ${showMismatch ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-amber-400'}`}
                            />
                            <button
                                type="button"
                                onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-amber-400"
                            >
                                {isConfirmPasswordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                            </button>
                        </div>
                        
                        {/* Container Unificado para Feedback de Senha */}
                        <div className="flex justify-between items-center mt-1.5 px-1 min-h-[20px]">
                            {/* Aviso de Senhas Diferentes (Esquerda) */}
                            <div className="flex-1">
                                {showMismatch && (
                                    <p className="text-red-500 text-xs font-bold flex items-center gap-1 animate-pulse">
                                        <ExclamationCircleIcon className="h-3 w-3 inline"/> As senhas não coincidem.
                                    </p>
                                )}
                            </div>

                            {/* Indicador de Força da Senha (Direita) */}
                            {password && (
                                <div className="text-right text-xs font-medium ml-2">
                                    <span className="text-gray-400 mr-1">Força:</span>
                                    <span className={`${passStrength.color} font-bold`}>{passStrength.label}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <button type="submit" disabled={isLoading} className="w-full py-2.5 sm:py-3 px-4 bg-amber-400 text-black font-bold rounded-md hover:bg-amber-300 transition flex justify-center items-center disabled:opacity-60 text-base sm:text-lg">
                        {isLoading ? <SpinnerIcon /> : 'Registrar'}
                    </button>
                </motion.form>
                
                 <motion.div variants={itemVariants} className="text-center mt-5 text-xs sm:text-sm">
                     <p className="text-gray-400">
                        Já tem uma conta?{' '}
                        <a href="#login" onClick={(e) => {e.preventDefault(); onNavigate('login')}} className="font-semibold text-amber-400 hover:underline">Faça o login</a>
                    </p>
                </motion.div>
            </motion.div>
        </div>
    );
};

const ForgotPasswordPage = ({ onNavigate }) => {
    const notification = useNotification();
    const [email, setEmail] = useState('');
    const [cpf, setCpf] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [step, setStep] = useState(1);
    const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    const handleValidation = async (e) => {
        e.preventDefault();
        setError('');
        if (!validateCPF(cpf)) {
            setError("O CPF informado é inválido.");
            return;
        }

        try {
            await apiService('/forgot-password', 'POST', { email, cpf });
            notification.show('Usuário validado com sucesso. Por favor, crie uma nova senha.');
            setStep(2);
        } catch (err) {
            setError(err.message || 'E-mail ou CPF não correspondem a um usuário cadastrado.');
            notification.show(err.message || 'Dados inválidos.', 'error');
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < 6) {
            setError("A nova senha deve ter pelo menos 6 caracteres.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("As senhas não coincidem.");
            return;
        }
        try {
            await apiService('/reset-password', 'POST', { email, cpf, newPassword });
            notification.show('Senha redefinida com sucesso! Você já pode fazer login.');
            setTimeout(() => onNavigate('login'), 2000);
        } catch (err) {
            setError(err.message);
            notification.show(err.message, 'error');
        }
    };

    return (
         // --- MODIFICAÇÃO: Estilo do container principal e padding ---
        <div className="min-h-screen flex items-center justify-center bg-black p-4 sm:p-6"> {/* Fundo preto sólido, padding ajustado */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                // --- MODIFICAÇÃO: Estilo do card, cores e responsividade ---
                className="w-full max-w-sm sm:max-w-md bg-gray-900 text-white p-6 sm:p-8 rounded-lg shadow-lg border border-gray-800" // Fundo mais escuro, padding ajustado, tamanho máximo ajustado
            >
                <motion.div variants={itemVariants} className="text-center mb-6">
                     {/* --- MODIFICAÇÃO: Tamanho do título --- */}
                    <h2 className="text-2xl sm:text-3xl font-bold text-amber-400">Recuperar Senha</h2>
                </motion.div>

                {error && <p className="text-red-400 text-center mb-4 bg-red-900/50 p-3 rounded-md text-sm">{error}</p>}

                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.form
                            key="step1"
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            onSubmit={handleValidation} className="space-y-4"> {/* Reduzido space-y */}
                             {/* --- MODIFICAÇÃO: Tamanho de texto da descrição --- */}
                            <p className="text-xs sm:text-sm text-gray-400 text-center">Para começar, por favor, insira seu e-mail e CPF cadastrados.</p>
                            {/* --- MODIFICAÇÃO: Padding e tamanho de texto dos inputs --- */}
                            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 text-sm sm:text-base" />
                            <input type="text" placeholder="CPF" value={cpf} onChange={e => setCpf(maskCPF(e.target.value))} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 text-sm sm:text-base" />
                            {/* --- MODIFICAÇÃO: Padding e tamanho de texto do botão --- */}
                            <button type="submit" className="w-full py-2.5 sm:py-3 px-4 bg-amber-400 text-black font-bold rounded-md hover:bg-amber-300 transition text-base sm:text-lg">Verificar</button>
                        </motion.form>
                    ) : (
                        <motion.form
                            key="step2"
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            onSubmit={handlePasswordReset} className="space-y-4"> {/* Reduzido space-y */}
                            {/* --- MODIFICAÇÃO: Tamanho de texto da descrição --- */}
                            <p className="text-xs sm:text-sm text-gray-400 text-center">Usuário validado! Agora, crie sua nova senha.</p>
                            {/* --- MODIFICAÇÃO: Padding e tamanho de texto dos inputs de senha --- */}
                            <div className="relative">
                                <input
                                    type={isNewPasswordVisible ? 'text' : 'password'}
                                    placeholder="Nova Senha"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                    className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 pr-10 text-sm sm:text-base"
                                />
                                <button type="button" onClick={() => setIsNewPasswordVisible(!isNewPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-amber-400">
                                    {isNewPasswordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type={isConfirmPasswordVisible ? 'text' : 'password'}
                                    placeholder="Confirmar Nova Senha"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 pr-10 text-sm sm:text-base"
                                />
                                <button type="button" onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-amber-400">
                                    {isConfirmPasswordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                                </button>
                            </div>
                            {/* --- MODIFICAÇÃO: Padding e tamanho de texto do botão --- */}
                            <button type="submit" className="w-full py-2.5 sm:py-3 px-4 bg-amber-400 text-black font-bold rounded-md hover:bg-amber-300 transition text-base sm:text-lg">Redefinir Senha</button>
                        </motion.form>
                    )}
                </AnimatePresence>

                 {/* --- MODIFICAÇÃO: Tamanho de texto do link --- */}
                <motion.div variants={itemVariants} className="text-center mt-5 text-xs sm:text-sm">
                    <a href="#login" onClick={(e) => { e.preventDefault(); onNavigate('login'); }} className="text-gray-400 hover:underline">Voltar para o Login</a>
                </motion.div>
            </motion.div>
        </div>
    );
};

const CartPage = ({ onNavigate }) => {
    const {
        cart,
        updateQuantity,
        removeFromCart,
        autoCalculatedShipping,
        isLoadingShipping,
        shippingError,
        couponCode, setCouponCode,
        applyCoupon, removeCoupon,
        couponMessage, appliedCoupon,
        discount // Usando o desconto calculado no Contexto (que tem a validação correta)
    } = useShop();
    const notification = useNotification();

    const subtotal = useMemo(() => cart.reduce((sum, item) => {
        const price = item.is_on_sale && item.sale_price ? item.sale_price : item.price;
        return sum + price * item.qty;
    }, 0), [cart]);

    const shippingCost = useMemo(() => autoCalculatedShipping ? autoCalculatedShipping.price : 0, [autoCalculatedShipping]);

    const handleApplyCoupon = (e) => {
        e.preventDefault();
        if (couponCode.trim()) {
            applyCoupon(couponCode);
        }
    }

    const total = useMemo(() => {
        // O desconto já vem calculado corretamente do ShopProvider, respeitando as restrições
        const calculatedTotal = subtotal - discount + shippingCost;
        return calculatedTotal < 0 ? 0 : calculatedTotal; 
    }, [subtotal, discount, shippingCost]);


    const handleUpdateQuantity = async (cartItemId, newQuantity) => {
        try {
            await updateQuantity(cartItemId, newQuantity);
        } catch (error) {
            notification.show(error.message, 'error');
        }
    };

    return (
        <div className="bg-black text-white min-h-screen">
            <div className="container mx-auto px-4 py-12"> 
                <h1 className="text-3xl md:text-4xl font-bold mb-10 text-center">Meu Carrinho</h1> 
                {cart.length === 0 ? (
                    <EmptyState
                        icon={<CartIcon className="h-12 w-12"/>}
                        title="Seu carrinho está vazio"
                        message="Explore nossos produtos e adicione seus favoritos!"
                        buttonText="Ver Produtos"
                        onButtonClick={() => onNavigate('products')}
                    />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10"> 
                        {/* Coluna de Itens e Frete */}
                        <div className="lg:col-span-2 space-y-8"> 
                            {/* Card de Itens */}
                            <div className="bg-gray-900 rounded-lg border border-gray-800 shadow-lg">
                                <h2 className="text-xl font-semibold p-5 border-b border-gray-700 text-amber-400">Itens no Carrinho ({cart.length})</h2>
                                <div className="divide-y divide-gray-700">
                                    {cart.map(item => {
                                        const isOnSale = item.is_on_sale && item.sale_price > 0;
                                        const currentPrice = isOnSale ? item.sale_price : item.price;
                                        const itemSubtotal = currentPrice * item.qty;
                                        return (
                                        <motion.div
                                            key={item.cartItemId}
                                            layout // Anima a remoção
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0, x: -50 }}
                                            transition={{ duration: 0.3 }}
                                            className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 gap-4"
                                        >
                                            <div className="flex items-center w-full md:w-auto flex-grow">
                                                <div
                                                    className="w-24 h-24 bg-white rounded-md flex-shrink-0 cursor-pointer p-1 border border-gray-700" 
                                                    onClick={() => onNavigate(`product/${item.id}`)}
                                                >
                                                    <img src={getFirstImage(item.images, 'https://placehold.co/96x96/222/fff?text=Img')} alt={item.name} className="w-full h-full object-contain"/>
                                                </div>
                                                <div className="flex-grow px-4">
                                                    <h3 className="font-bold text-lg cursor-pointer hover:text-amber-400 transition line-clamp-2" onClick={() => onNavigate(`product/${item.id}`)}>{item.name}</h3>
                                                    {item.variation && (
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {item.variation.color} / {item.variation.size}
                                                        </p>
                                                    )}
                                                    {isOnSale ? (
                                                        <div className="flex items-baseline gap-2 mt-1">
                                                            <p className="text-base text-red-500 font-bold">R$&nbsp;{Number(currentPrice).toFixed(2)}</p>
                                                            <p className="text-xs text-gray-500 line-through">R$&nbsp;{Number(item.price).toFixed(2)}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-base text-amber-400 mt-1">R$&nbsp;{Number(item.price).toFixed(2)}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between w-full md:w-auto gap-4 md:gap-6">
                                                {/* Controle de Quantidade */}
                                                <div className="flex items-center border border-gray-700 rounded-md overflow-hidden h-9">
                                                    <button onClick={() => handleUpdateQuantity(item.cartItemId, item.qty - 1)} className="px-3 text-lg hover:bg-gray-700 transition-colors h-full flex items-center">-</button>
                                                    <span className="w-10 text-center font-semibold text-sm border-x border-gray-700 h-full flex items-center justify-center">{item.qty}</span>
                                                    <button onClick={() => handleUpdateQuantity(item.cartItemId, item.qty + 1)} className="px-3 text-lg hover:bg-gray-700 transition-colors h-full flex items-center">+</button>
                                                </div>
                                                {/* Subtotal Item */}
                                                <p className="font-bold text-base w-24 text-right">R$&nbsp;{itemSubtotal.toFixed(2)}</p>
                                                {/* Remover Item */}
                                                <button onClick={() => removeFromCart(item.cartItemId)} className="text-gray-500 hover:text-red-500 transition-colors" title="Remover item">
                                                    <TrashIcon className="h-5 w-5"/>
                                                </button>
                                            </div>
                                        </motion.div>
                                        )
                                    })}
                                </div>
                                <div className="p-5 border-t border-gray-700 text-right">
                                     <button onClick={() => onNavigate('products')} className="text-amber-400 hover:underline text-sm font-semibold flex items-center gap-1.5 ml-auto w-fit">
                                        <PlusIcon className="h-4 w-4"/> Continuar Comprando
                                    </button>
                                </div>
                            </div>
                            {/* Calculadora de Frete (mantém componente externo) */}
                            <ShippingCalculator items={cart} />
                        </div>

                        {/* Coluna de Resumo */}
                        <div className="lg:col-span-1">
                            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 shadow-lg h-fit lg:sticky lg:top-28">
                                <h2 className="text-2xl font-bold mb-6 text-center text-amber-400">Resumo do Pedido</h2>
                                <div className="space-y-3 mb-5 border-b border-gray-700 pb-5">
                                    <div className="flex justify-between text-gray-300 text-sm"><span>Subtotal Produtos</span><span>R$&nbsp;{subtotal.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-gray-300 text-sm">
                                        <span>Frete</span>
                                        {isLoadingShipping ? (
                                            <SpinnerIcon className="h-5 w-5 text-amber-400" />
                                        ) : autoCalculatedShipping ? (
                                            <span>{shippingCost > 0 ? `R$ ${shippingCost.toFixed(2)}` : 'Grátis'}</span>
                                        ) : (
                                            <span className="text-xs text-gray-500">Selecione o CEP</span>
                                        )}
                                    </div>
                                    {shippingError && <p className="text-red-400 text-xs text-right -mt-2">{shippingError}</p>}
                                    {appliedCoupon && (
                                        <div className="flex justify-between text-green-400 text-sm">
                                            <span>Desconto ({appliedCoupon.code})</span>
                                            <span>- R$&nbsp;{discount.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-between font-bold text-xl mb-6">
                                    <span>Total</span>
                                    <span className="text-amber-400">R$&nbsp;{total.toFixed(2)}</span>
                                </div>

                                {/* Seção do Cupom */}
                                <div className="mb-6">
                                    {!appliedCoupon ? (
                                        <>
                                        <form onSubmit={handleApplyCoupon} className="flex space-x-2">
                                            <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} type="text" placeholder="Código do Cupom" className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 text-sm" />
                                            <button type="submit" className="px-4 bg-amber-400 text-black font-bold rounded-md hover:bg-amber-300 text-sm transition-colors">Aplicar</button>
                                        </form>
                                        {couponMessage && <p className={`text-xs mt-2 text-center ${couponMessage.includes('aplicado') ? 'text-green-400' : 'text-red-400'}`}>{couponMessage}</p>}
                                        </>
                                    ) : (
                                        <div className="flex justify-between items-center bg-green-900/50 p-3 rounded-md border border-green-700">
                                            <p className="text-sm text-green-300 flex items-center gap-2"><CheckCircleIcon className="h-5 w-5"/> Cupom <strong>{appliedCoupon.code}</strong> aplicado!</p>
                                            <button onClick={removeCoupon} className="text-xs text-red-400 hover:underline flex-shrink-0">Remover</button>
                                        </div>
                                    )}
                                </div>

                                {/* Botão Checkout */}
                                <button
                                    onClick={() => onNavigate('checkout')}
                                    className="w-full bg-gradient-to-r from-amber-400 to-amber-500 text-black py-3.5 rounded-md hover:from-amber-300 hover:to-amber-400 font-bold text-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:bg-gray-600 flex items-center justify-center gap-2"
                                    disabled={!autoCalculatedShipping || cart.length === 0}
                                >
                                    <CheckBadgeIcon className="h-5 w-5" />
                                    Finalizar Compra
                                </button>
                                {!autoCalculatedShipping && cart.length > 0 && <p className="text-center text-xs text-red-400 mt-3">Calcule o frete para continuar.</p>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
// NOVO COMPONENTE: WishlistItemCard
const WishlistItemCard = memo(({ item, onRemove, onNavigate }) => {
    const { addToCart } = useShop(); // Pega addToCart do contexto
    const notification = useNotification();
    const [isAddingToCart, setIsAddingToCart] = useState(false);

    const imageUrl = getFirstImage(item.images);
    const isOnSale = !!(item.is_on_sale && item.sale_price > 0 && Number(item.price) > Number(item.sale_price));
    const currentPrice = isOnSale ? item.sale_price : item.price;
    const isOutOfStock = item.stock <= 0;

    const handleAddToCart = async (e) => {
        e.stopPropagation();
        if (item.product_type === 'clothing') {
            notification.show("Escolha cor e tamanho na página do produto.", "error");
            onNavigate(`product/${item.id}`);
            return;
        }
        if (isOutOfStock) {
             notification.show("Este item está fora de estoque.", "error");
             return;
        }

        setIsAddingToCart(true);
        try {
            await addToCart(item, 1);
            notification.show(`${item.name} adicionado ao carrinho!`);
        } catch (error) {
            notification.show(error.message || "Erro ao adicionar ao carrinho", "error");
        } finally {
            setIsAddingToCart(false);
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
    };

    return (
        <motion.div
            layout // Garante animação suave ao remover
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex flex-col h-full"
        >
            <div className="relative h-48 sm:h-56 bg-white overflow-hidden group">
                <img
                    src={imageUrl}
                    alt={item.name}
                    className="w-full h-full object-contain cursor-pointer transition-transform duration-300 group-hover:scale-105"
                    onClick={() => onNavigate(`product/${item.id}`)}
                />
                 {isOutOfStock && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10">ESGOTADO</div>
                )}
                {isOnSale && !isOutOfStock && (
                     <div className="absolute top-2 right-2 bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10">OFERTA</div>
                )}
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <div className="flex-grow">
                    <p className="text-xs text-amber-400 font-semibold tracking-wider mb-1">{item.brand?.toUpperCase()}</p>
                    <h4
                        className="text-base font-bold tracking-tight cursor-pointer hover:text-amber-400 line-clamp-2"
                        onClick={() => onNavigate(`product/${item.id}`)}
                        title={item.name}
                    >
                        {item.name}
                    </h4>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-700">
                    {isOnSale ? (
                        <div>
                            <p className="text-sm font-light text-gray-500 line-through">R$ {Number(item.price).toFixed(2).replace('.', ',')}</p>
                            <p className="text-xl font-bold text-red-500">R$ {Number(currentPrice).toFixed(2).replace('.', ',')}</p>
                        </div>
                    ) : (
                        <p className="text-xl font-semibold text-white">R$ {Number(currentPrice).toFixed(2).replace('.', ',')}</p>
                    )}
                </div>

                <div className="mt-4 flex gap-2">
                    <button
                        onClick={handleAddToCart}
                        disabled={isAddingToCart || isOutOfStock}
                        className={`flex-grow ${isOutOfStock ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-amber-400 text-black hover:bg-amber-300'} transition font-bold py-2 px-3 rounded-md text-sm flex items-center justify-center gap-2 disabled:opacity-70`}
                    >
                        {isAddingToCart ? <SpinnerIcon className="h-5 w-5"/> : <CartIcon className="h-5 w-5"/>}
                        {isOutOfStock ? 'Esgotado' : (item.product_type === 'clothing' ? 'Ver Opções' : 'Add Carrinho')}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(item); }}
                        title="Remover da lista"
                        className="flex-shrink-0 border border-gray-700 text-gray-400 p-2 rounded-md hover:bg-red-900/50 hover:border-red-700 hover:text-red-400 transition"
                    >
                        <TrashIcon className="h-5 w-5"/>
                    </button>
                </div>
            </div>
        </motion.div>
    );
});


const WishlistPage = ({ onNavigate }) => {
    const { wishlist, removeFromWishlist } = useShop(); // Pegar addToCart foi removido daqui
    const notification = useNotification();

    const handleRemove = async (item) => {
        await removeFromWishlist(item.id);
        notification.show(`${item.name} removido da lista de desejos.`, 'error');
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 } // Anima os filhos em sequência
        }
    };

    return (
        <div className="bg-black text-white min-h-screen py-12">
            <div className="container mx-auto px-4">
                <h1 className="text-3xl md:text-4xl font-bold mb-10 text-center">Lista de Desejos</h1>
                {wishlist.length === 0 ? (
                    <EmptyState
                        icon={<HeartIcon className="h-12 w-12"/>}
                        title="Sua lista de desejos está vazia"
                        message="Adicione produtos que você ama para encontrá-los facilmente mais tarde."
                        buttonText="Ver Produtos"
                        onButtonClick={() => onNavigate('products')}
                    />
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                    >
                        <AnimatePresence>
                            {wishlist.map(item => (
                                <WishlistItemCard
                                    key={item.id}
                                    item={item}
                                    onRemove={handleRemove}
                                    onNavigate={onNavigate}
                                    // onAddToCart não é mais passado, pois o card lida com isso
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

const AddressForm = ({ initialData = {}, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        alias: '',
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        localidade: '',
        uf: '',
        is_default: false,
        ...initialData
    });
    const [isSaving, setIsSaving] = useState(false);
    const notification = useNotification();

    const handleCepLookup = useCallback(async (cepValue) => {
        const cep = cepValue.replace(/\D/g, '');
        if (cep.length !== 8) return;
        
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            if (!response.ok) throw new Error('Falha na resposta da API de CEP.');
            
            const data = await response.json();
            if (!data.erro) {
                setFormData(prev => ({ 
                    ...prev, 
                    logradouro: data.logradouro, 
                    bairro: data.bairro, 
                    localidade: data.localidade, 
                    uf: data.uf
                }));
            } else {
                notification.show("CEP não encontrado.", "error");
            }
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
            notification.show("Não foi possível buscar o CEP. Tente novamente.", "error");
        }
    }, [notification]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleCepChange = (e) => {
        const newCep = maskCEP(e.target.value);
        setFormData(prev => ({ ...prev, cep: newCep }));
        if (newCep.replace(/\D/g, '').length === 8) {
            handleCepLookup(newCep);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave(formData);
        setIsSaving(false);
    };
    
    const isFormValid = useMemo(() => {
        const { alias, cep, logradouro, numero, bairro, localidade, uf } = formData;
        return alias && cep.replace(/\D/g, '').length === 8 && logradouro && numero && bairro && localidade && uf;
    }, [formData]);

    return (
        <form onSubmit={handleSubmit} className="space-y-4 text-gray-800">
            <input name="alias" value={formData.alias} onChange={handleChange} placeholder="Apelido do Endereço (ex: Casa, Trabalho)" className="w-full p-3 bg-gray-100 border border-gray-300 rounded-md" required />
            <input name="cep" value={formData.cep} onChange={handleCepChange} placeholder="CEP" className="w-full p-3 bg-gray-100 border border-gray-300 rounded-md" required />
            <input name="logradouro" value={formData.logradouro} onChange={handleChange} placeholder="Rua / Logradouro" className="w-full p-3 bg-gray-100 border border-gray-300 rounded-md" required />
            <div className="flex space-x-4">
                <input name="numero" value={formData.numero} onChange={handleChange} placeholder="Número" className="w-1/2 p-3 bg-gray-100 border border-gray-300 rounded-md" required />
                <input name="complemento" value={formData.complemento} onChange={handleChange} placeholder="Complemento (Opcional)" className="w-1/2 p-3 bg-gray-100 border border-gray-300 rounded-md" />
            </div>
            <input name="bairro" value={formData.bairro} onChange={handleChange} placeholder="Bairro" className="w-full p-3 bg-gray-100 border border-gray-300 rounded-md" required />
            <div className="flex space-x-4">
                <input name="localidade" value={formData.localidade} onChange={handleChange} placeholder="Cidade" className="flex-grow p-3 bg-gray-100 border border-gray-300 rounded-md" required />
                <input name="uf" value={formData.uf} onChange={handleChange} placeholder="UF" className="w-1/4 p-3 bg-gray-100 border border-gray-300 rounded-md" required />
            </div>
            <div className="flex items-center">
                <input type="checkbox" id="is_default" name="is_default" checked={formData.is_default} onChange={handleChange} className="h-4 w-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500" />
                <label htmlFor="is_default" className="ml-2 block text-sm text-gray-700">Salvar como endereço padrão</label>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
                <button type="submit" disabled={!isFormValid || isSaving} className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 disabled:bg-gray-400 flex items-center justify-center">
                    {isSaving ? <SpinnerIcon /> : 'Salvar Endereço'}
                </button>
            </div>
        </form>
    );
};

const AddressSelectionModal = ({ isOpen, onClose, addresses, onSelectAddress, onAddNewAddress }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Selecione um Endereço de Entrega" size="md">
            <div className="space-y-3">
                {addresses.map(addr => (
                    <div 
                        key={addr.id} 
                        onClick={() => onSelectAddress(addr)}
                        className="p-4 border-2 rounded-lg cursor-pointer transition-all bg-gray-50 hover:border-amber-400 hover:bg-amber-50"
                    >
                        <p className="font-bold text-gray-800">{addr.alias} {addr.is_default ? <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full ml-2">Padrão</span> : ''}</p>
                        <p className="text-sm text-gray-600">{addr.logradouro}, {addr.numero}</p>
                        <p className="text-sm text-gray-500">{addr.bairro}, {addr.localidade} - {addr.uf}</p>
                        <p className="text-sm text-gray-500">{addr.cep}</p>
                    </div>
                ))}
                {addresses.length < 5 && (
                    <button 
                        onClick={onAddNewAddress}
                        className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors"
                    >
                        <PlusCircleIcon className="h-6 w-6" />
                        <span>Adicionar Novo Endereço</span>
                    </button>
                )}
            </div>
        </Modal>
    );
};

const CheckoutSection = ({ title, step, children, icon: Icon }) => (
     <div className="bg-gray-900 rounded-lg border border-gray-800 shadow-md">
        <div className="flex items-center gap-3 p-4 border-b border-gray-700">
            {Icon && <Icon className="h-6 w-6 text-amber-400 flex-shrink-0"/>}
            <h2 className="text-xl font-bold text-amber-400 tracking-wide">{step ? `${step}. ` : ''}{title}</h2>
        </div>
        <div className="p-5">
            {children}
        </div>
    </div>
);

const CheckoutPage = ({ onNavigate }) => {
    const { user } = useAuth();
    const {
        cart,
        autoCalculatedShipping,
        appliedCoupon,
        clearOrderState,
        addresses,
        fetchAddresses,
        shippingLocation,
        setShippingLocation,
        shippingOptions,
        setAutoCalculatedShipping,
        setSelectedShippingName
    } = useShop();
    const notification = useNotification();

    const [displayAddress, setDisplayAddress] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('mercadopago');
    const [isLoading, setIsLoading] = useState(false);
    const [isAddressLoading, setIsAddressLoading] = useState(true);
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [isNewAddressModalOpen, setIsNewAddressModalOpen] = useState(false);
    const [isSomeoneElsePickingUp, setIsSomeoneElsePickingUp] = useState(false);
    const [pickupPersonName, setPickupPersonName] = useState('');
    const [pickupPersonCpf, setPickupPersonCpf] = useState('');
    const [whatsapp, setWhatsapp] = useState(''); 

    // --- NOVA PROTEÇÃO DE FLUXO ---
    // Se o usuário já tiver um pedido pendente (ex: fechou o MP e voltou),
    // redireciona para a tela de sucesso/pagamento ao invés de ficar preso no checkout.
    useEffect(() => {
        const pendingOrderId = sessionStorage.getItem('pendingOrderId');
        if (pendingOrderId) {
            console.log("Pedido pendente detectado no Checkout. Redirecionando...");
            onNavigate(`order-success/${pendingOrderId}`);
        }
    }, [onNavigate]);

    // Efeito para preencher WhatsApp e dados iniciais
    useEffect(() => {
        setIsAddressLoading(true);
        if (user && user.phone) {
            setWhatsapp(maskPhone(user.phone));
        }

        fetchAddresses().then(userAddresses => {
            let addressToSet = null;
            
            // Lógica melhorada para selecionar endereço válido
            if (shippingLocation && shippingLocation.cep) {
                // Tenta achar um endereço salvo COMPLETO com este CEP
                const matchingSavedAddress = userAddresses.find(addr =>
                    addr.cep === shippingLocation.cep &&
                    addr.logradouro && addr.numero && addr.bairro 
                );
                
                if (matchingSavedAddress) {
                    addressToSet = matchingSavedAddress;
                } else {
                    // Endereço temporário incompleto (exige cadastro)
                    addressToSet = {
                        cep: shippingLocation.cep,
                        localidade: shippingLocation.city,
                        uf: shippingLocation.state,
                        alias: 'Endereço Incompleto (Preencha os dados)',
                        logradouro: '',
                        numero: '',
                        bairro: '',
                        is_incomplete: true
                    };
                }
            }

            if (!addressToSet) {
                addressToSet = userAddresses.find(addr => addr.is_default) || userAddresses[0] || null;
            }
            
            setDisplayAddress(addressToSet);

            if (addressToSet && addressToSet.cep && addressToSet.cep !== shippingLocation?.cep) {
                 setShippingLocation({
                    cep: addressToSet.cep, city: addressToSet.localidade, state: addressToSet.uf, alias: addressToSet.alias
                 });
            }
        }).finally(() => {
            setIsAddressLoading(false);
        });
    }, [fetchAddresses, shippingLocation, setShippingLocation, user]);

    // Efeito para valores iniciais de retirada
    useEffect(() => {
        if (user && !isSomeoneElsePickingUp) {
            setPickupPersonName(user.name || '');
            setPickupPersonCpf(maskCPF(user.cpf || '')); 
        } else {
            setPickupPersonName('');
            setPickupPersonCpf('');
        }
    }, [user, isSomeoneElsePickingUp]);

    const handleSelectShipping = (option) => {
        setAutoCalculatedShipping(option);
        setSelectedShippingName(option.name);
        if(option.isPickup) {
            setDisplayAddress(null);
            if (!isSomeoneElsePickingUp && user) {
                setPickupPersonName(user.name || '');
                setPickupPersonCpf(maskCPF(user.cpf || '')); 
            } else {
                 setPickupPersonName('');
                 setPickupPersonCpf('');
            }
        } else if (!displayAddress && addresses.length > 0) {
             const defaultOrFirst = addresses.find(addr => addr.is_default) || addresses[0];
             if (defaultOrFirst) {
                setDisplayAddress(defaultOrFirst);
                setShippingLocation({ cep: defaultOrFirst.cep, city: defaultOrFirst.localidade, state: defaultOrFirst.uf, alias: defaultOrFirst.alias });
             }
        }
    };

    const handleAddressSelection = (address) => {
        setDisplayAddress(address);
        setShippingLocation({ cep: address.cep, city: address.localidade, state: address.uf, alias: address.alias });
        setIsAddressModalOpen(false);
    };
    
    const handleAddNewAddress = () => {
        setIsAddressModalOpen(false);
        setIsNewAddressModalOpen(true);
    };
    
    const handleSaveNewAddress = async (formData) => {
        try {
            const savedAddress = await apiService('/addresses', 'POST', formData);
            notification.show('Endereço salvo com sucesso!');
            const updatedAddresses = await fetchAddresses();
            const newAddress = updatedAddresses.find(a => a.id === savedAddress.id) || savedAddress;
            setDisplayAddress(newAddress);
            setShippingLocation({ cep: newAddress.cep, city: newAddress.localidade, state: newAddress.uf, alias: newAddress.alias });
            setIsNewAddressModalOpen(false);
        } catch (error) {
            notification.show(`Erro ao salvar endereço: ${error.message}`, 'error');
        }
    };

    const handleWhatsappChange = (e) => {
        setWhatsapp(maskPhone(e.target.value));
    };

    const subtotal = useMemo(() => {
        return cart.reduce((sum, item) => {
            const price = Number(item.is_on_sale && item.sale_price ? item.sale_price : item.price) || 0;
            const quantity = Number(item.qty) || 0;
            return sum + (price * quantity);
        }, 0);
    }, [cart]);
    
    const shippingCost = useMemo(() => Number(autoCalculatedShipping?.price) || 0, [autoCalculatedShipping]);
    
    const discount = useMemo(() => {
        if (!appliedCoupon) return 0;
        let val = 0;
        const couponValue = Number(appliedCoupon.value) || 0;
        const currentSubtotal = Number(subtotal) || 0;
        const currentShippingCost = Number(shippingCost) || 0;
        if (appliedCoupon.type === 'percentage') {
            val = currentSubtotal * (couponValue / 100);
        } else if (appliedCoupon.type === 'fixed') {
            val = couponValue;
        } else if (appliedCoupon.type === 'free_shipping') {
            val = currentShippingCost;
        }
        const currentTotalBeforeDiscount = currentSubtotal + currentShippingCost;
        return Math.max(0, (appliedCoupon.type !== 'free_shipping' && val > currentTotalBeforeDiscount) ? currentTotalBeforeDiscount : val);
    }, [appliedCoupon, subtotal, shippingCost]);
    
    const total = useMemo(() => {
        const finalTotal = (Number(subtotal) || 0) - (Number(discount) || 0) + (Number(shippingCost) || 0);
        return Math.max(0, finalTotal);
    }, [subtotal, discount, shippingCost]);

    const getShippingName = (name) => name?.toLowerCase().includes('pac') ? 'PAC' : (name || 'N/A');
    
    const getDeliveryDateText = (deliveryTime) => {
        // Se for string "1 dia útil", calcula a data
        if (typeof deliveryTime === 'string' && deliveryTime.includes('1 dia')) {
            const date = new Date();
            let addedDays = 0;
            while (addedDays < 1) {
                date.setDate(date.getDate() + 1);
                if (date.getDay() !== 0 && date.getDay() !== 6) addedDays++;
            }
            const formattedDate = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
            return `Receba até ${formattedDate}. (1 dia útil)`;
        }

        const timeInDays = Number(deliveryTime);
        if (isNaN(timeInDays) || timeInDays <= 0) return 'Prazo indisponível';

        const date = new Date();
        let addedBusinessDays = 0;
        date.setDate(date.getDate() + 1);
        if (date.getDay() === 0) date.setDate(date.getDate() + 1);
        else if (date.getDay() === 6) date.setDate(date.getDate() + 2);

        while (addedBusinessDays < timeInDays) {
            date.setDate(date.getDate() + 1);
            if (date.getDay() !== 0 && date.getDay() !== 6) {
                addedBusinessDays++;
            }
        }
        return `Previsão: ${date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}`;
    };

    const handlePickupNameBlur = (e) => { setPickupPersonName(e.target.value); };
    const handleCpfInputChangeMask = (e) => { e.target.value = maskCPF(e.target.value); };
    const handlePickupCpfBlur = (e) => { setPickupPersonCpf(maskCPF(e.target.value)); };

    const canPlaceOrder = useMemo(() => {
        const isPickup = autoCalculatedShipping?.isPickup;
        
        if (isPickup) {
             if (isSomeoneElsePickingUp) {
                 return pickupPersonName.length > 3 && pickupPersonCpf.length >= 11;
             }
             return true; 
        }

        if (!displayAddress) return false;
        
        const hasValidStreet = displayAddress.logradouro && displayAddress.logradouro !== 'N/A' && displayAddress.logradouro.trim() !== '';
        const hasValidNumber = displayAddress.numero && displayAddress.numero !== 'N/A' && displayAddress.numero.trim() !== '';
        const hasValidNeighborhood = displayAddress.bairro && displayAddress.bairro !== 'N/A' && displayAddress.bairro.trim() !== '';
        const isNotMarkedIncomplete = !displayAddress.is_incomplete;

        return hasValidStreet && hasValidNumber && hasValidNeighborhood && isNotMarkedIncomplete;
    }, [displayAddress, autoCalculatedShipping, isSomeoneElsePickingUp, pickupPersonName, pickupPersonCpf]);


    const handlePlaceOrderAndPay = async () => {
        const isPickup = autoCalculatedShipping?.isPickup;
        
        if (!canPlaceOrder && !isPickup) {
             notification.show("Por favor, complete o endereço de entrega (Rua, Número e Bairro) para continuar.", 'error');
             setIsNewAddressModalOpen(true); 
             return;
        }
        
        if (!whatsapp || !validatePhone(whatsapp)) {
            notification.show("Por favor, informe um número de WhatsApp válido para contato.", 'error');
            return;
        }

        const nameToCheck = isSomeoneElsePickingUp ? pickupPersonName : user?.name;
        const cpfToCheck = isSomeoneElsePickingUp ? pickupPersonCpf : user?.cpf;
        
        if (isPickup && (!nameToCheck || !validateCPF(cpfToCheck))) {
            if(!isSomeoneElsePickingUp && !user) {
                 notification.show("Faça login ou marque 'Outra pessoa vai retirar?' e preencha os dados.", 'error');
            } else {
                notification.show("Preencha nome e CPF válidos para quem vai retirar.", 'error');
            }
            return;
        }

        setIsLoading(true);
        try {
            const finalShippingAddress = (isPickup || !displayAddress || !displayAddress.id) ? null : displayAddress;
            const cpfToSend = (isSomeoneElsePickingUp ? pickupPersonCpf : user?.cpf)?.replace(/\D/g, '') || '';
            const nameToSend = isSomeoneElsePickingUp ? pickupPersonName : user?.name;

            const orderPayload = {
                items: cart.map(item => ({ id: item.id, qty: item.qty, price: (item.is_on_sale && item.sale_price ? item.sale_price : item.price), variation: item.variation })),
                total, 
                shippingAddress: finalShippingAddress, 
                paymentMethod,
                shipping_method: autoCalculatedShipping.name, 
                shipping_cost: shippingCost,
                coupon_code: appliedCoupon?.code || null, 
                discount_amount: discount,
                pickup_details: isPickup ? JSON.stringify({ personName: nameToSend, personCpf: cpfToSend }) : null,
                phone: whatsapp.replace(/\D/g, '') // Envia apenas números
            };
            
            const { orderId } = await apiService('/orders', 'POST', orderPayload);

            if (paymentMethod === 'mercadopago') {
                sessionStorage.setItem('pendingOrderId', orderId);
                const { init_point } = await apiService('/create-mercadopago-payment', 'POST', { orderId });
                // ATUALIZAÇÃO: Usa assign para navegação explícita na mesma janela, 
                // tentando manter o contexto do navegador original.
                if (init_point) window.location.assign(init_point);
                else throw new Error("Link de pagamento não obtido.");
            } else {
                clearOrderState();
                onNavigate(`order-success/${orderId}`);
            }
        } catch (error) {
            notification.show(`Erro: ${error.message}`, 'error');
            setIsLoading(false);
        }
    };

    return (
        <>
            <AddressSelectionModal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} addresses={addresses} onSelectAddress={handleAddressSelection} onAddNewAddress={handleAddNewAddress} />
            <Modal isOpen={isNewAddressModalOpen} onClose={() => setIsNewAddressModalOpen(false)} title="Adicionar Novo Endereço"><AddressForm onSave={handleSaveNewAddress} onCancel={() => setIsNewAddressModalOpen(false)} /></Modal>

            <div className="bg-black text-white min-h-screen py-8 sm:py-12">
                <div className="container mx-auto px-4">
                    <button onClick={() => onNavigate('cart')} className="text-sm text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 mb-6 w-fit bg-gray-800/50 hover:bg-gray-700/50 px-3 py-1.5 rounded-md border border-gray-700">
                        <ArrowUturnLeftIcon className="h-4 w-4"/> Voltar ao Carrinho
                    </button>

                    <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center sm:text-left">Finalizar Pedido</h1>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">

                        <div className="lg:col-span-2 space-y-8">
                            
                            <CheckoutSection title="Contato para Status" step={1} icon={WhatsappIcon}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">WhatsApp para notificações do pedido <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                value={whatsapp} 
                                                onChange={handleWhatsappChange} 
                                                placeholder="(00) 00000-0000" 
                                                className="w-full pl-10 p-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 text-white" 
                                            />
                                            <WhatsappIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                                        </div>
                                    </div>
                                    <div className="bg-blue-900/30 border border-blue-800 p-3 rounded-md flex gap-3 items-start">
                                        <ExclamationCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-blue-200">
                                            Manteremos você informado sobre cada etapa do seu pedido (aprovação, envio e entrega) através deste número. 
                                            <br/>
                                            <span className="text-xs text-gray-400 mt-1 block">Caso altere o número aqui, seu cadastro será atualizado automaticamente.</span>
                                        </p>
                                    </div>
                                </div>
                            </CheckoutSection>

                            <CheckoutSection title="Forma de Entrega" step={2} icon={TruckIcon}>
                                <div className="space-y-3">
                                    {shippingOptions.map(option => (
                                        <div key={option.name} onClick={() => handleSelectShipping(option)}
                                             className={`relative p-4 rounded-lg border-2 transition cursor-pointer flex items-center justify-between gap-4 ${autoCalculatedShipping?.name === option.name ? 'border-amber-400 bg-gray-800 shadow-inner' : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'}`}>
                                            <div className="absolute top-3 left-3 w-5 h-5 flex items-center justify-center">
                                                <div className={`w-4 h-4 rounded-full border-2 ${autoCalculatedShipping?.name === option.name ? 'border-amber-400' : 'border-gray-500'}`}>
                                                    {autoCalculatedShipping?.name === option.name && <div className="w-full h-full p-0.5"><div className="w-full h-full rounded-full bg-amber-400"></div></div>}
                                                </div>
                                            </div>
                                            <div className="pl-8 flex-grow">
                                                <span className="font-bold text-base">{option.name}</span>
                                                <p className="text-xs text-gray-400 mt-0.5">{option.isPickup ? `Retire em nosso endereço físico.` : getDeliveryDateText(option.delivery_time)}</p>
                                            </div>
                                            <span className="font-bold text-amber-400 text-lg flex-shrink-0">{option.price > 0 ? `R$ ${option.price.toFixed(2)}` : 'Grátis'}</span>
                                        </div>
                                    ))}
                                </div>
                            </CheckoutSection>

                            {autoCalculatedShipping?.isPickup ? (
                                <CheckoutSection title="Detalhes da Retirada" icon={BoxIcon}>
                                     <div className="text-sm bg-gray-800 p-4 rounded-md space-y-2 border border-gray-700">
                                        <p className="font-bold">Endereço:</p>
                                        <p>R. Leopoldo Pereira Lima, 378 – Mangabeira VIII, João Pessoa – PB, 58059-123</p>
                                        <p className="font-bold mt-2">Horário:</p>
                                        <p>Seg a Sáb: 09h-11h30 e 15h-17h30 (exceto feriados)</p>
                                        <p className="text-amber-300 text-xs mt-2 font-semibold">Aguarde a notificação "Pronto para Retirada".</p>
                                    </div>
                                    <div className="mt-5 space-y-3">
                                        <div className="flex items-center">
                                            <input type="checkbox" id="pickup-checkbox" checked={isSomeoneElsePickingUp} onChange={(e) => setIsSomeoneElsePickingUp(e.target.checked)} className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-600 ring-offset-gray-900"/>
                                            <label htmlFor="pickup-checkbox" className="ml-2 text-sm text-gray-300">Outra pessoa vai retirar?</label>
                                        </div>
                                        {isSomeoneElsePickingUp && (
                                            <div key={isSomeoneElsePickingUp ? "pickup-form-on" : "pickup-form-off"} className="space-y-2 overflow-hidden bg-gray-800 p-3 rounded-md border border-gray-700">
                                                <input type="text" defaultValue={pickupPersonName} onBlur={handlePickupNameBlur} placeholder="Nome completo de quem vai retirar" className="w-full p-2 bg-gray-700 border-gray-600 border rounded text-sm"/>
                                                <input type="text" defaultValue={pickupPersonCpf} onInput={handleCpfInputChangeMask} onBlur={handlePickupCpfBlur} placeholder="CPF de quem vai retirar" maxLength="14" className="w-full p-2 bg-gray-700 border-gray-600 border rounded text-sm"/>
                                            </div>
                                        )}
                                    </div>
                                </CheckoutSection>
                            ) : (
                                <CheckoutSection title="Endereço de Entrega" icon={MapPinIcon}>
                                     {isAddressLoading ? (
                                        <div className="flex justify-center items-center h-24"><SpinnerIcon className="h-6 w-6 text-amber-400"/></div>
                                    ) : displayAddress && !displayAddress.is_incomplete ? (
                                        <div className="p-4 bg-gray-800 rounded-md border border-gray-700 relative">
                                            <div className="flex justify-between items-start">
                                                <p className="font-bold text-lg mb-2 text-white">{displayAddress.alias}</p>
                                                {!!displayAddress.is_default && <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-semibold">Padrão</span>}
                                            </div>
                                            <div className="space-y-1 text-gray-300 text-sm">
                                                <p><span className="font-semibold text-gray-500 w-16 inline-block">Rua:</span> {displayAddress.logradouro}</p>
                                                <p><span className="font-semibold text-gray-500 w-16 inline-block">Nº:</span> {displayAddress.numero} {displayAddress.complemento && `- ${displayAddress.complemento}`}</p>
                                                <p><span className="font-semibold text-gray-500 w-16 inline-block">Bairro:</span> {displayAddress.bairro}</p>
                                                <p><span className="font-semibold text-gray-500 w-16 inline-block">Cidade:</span> {displayAddress.localidade} - {displayAddress.uf}</p>
                                                <p><span className="font-semibold text-gray-500 w-16 inline-block">CEP:</span> {displayAddress.cep}</p>
                                            </div>
                                            <button onClick={() => setIsAddressModalOpen(true)} className="text-amber-400 hover:text-amber-300 mt-4 font-semibold text-sm flex items-center gap-1">
                                                <EditIcon className="h-4 w-4"/> Alterar Endereço
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center p-6 bg-red-900/20 rounded-md border border-red-800">
                                            <MapPinIcon className="h-10 w-10 mx-auto text-red-500 mb-3"/>
                                            <p className="text-red-200 font-bold mb-2 text-sm">Endereço Incompleto</p>
                                            <p className="text-gray-400 mb-4 text-xs">Precisamos do nome da rua e número para entregar.</p>
                                            <button onClick={() => setIsNewAddressModalOpen(true)} className="bg-amber-500 text-black px-5 py-2 rounded-md hover:bg-amber-400 font-bold text-sm flex items-center gap-2 mx-auto animate-pulse">
                                                <PlusIcon className="h-4 w-4"/> Preencher Endereço
                                            </button>
                                        </div>
                                    )}
                                </CheckoutSection>
                            )}

                            <CheckoutSection title="Forma de Pagamento" step={3} icon={CreditCardIcon}>
                                <div className="space-y-3">
                                    <div onClick={() => setPaymentMethod('mercadopago')}
                                         className={`relative p-4 rounded-lg border-2 transition cursor-pointer flex items-center gap-4 ${paymentMethod === 'mercadopago' ? 'border-amber-400 bg-gray-800 shadow-inner' : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'}`}>
                                        <div className="absolute top-3 left-3 w-5 h-5 flex items-center justify-center">
                                            <div className={`w-4 h-4 rounded-full border-2 ${paymentMethod === 'mercadopago' ? 'border-amber-400' : 'border-gray-500'}`}>
                                                {paymentMethod === 'mercadopago' && <div className="w-full h-full p-0.5"><div className="w-full h-full rounded-full bg-amber-400"></div></div>}
                                            </div>
                                        </div>
                                        <div className="pl-8 flex-grow">
                                            <span className="font-bold text-base text-white">Mercado Pago</span>
                                            <p className="text-xs text-gray-400 mt-0.5">Cartão de Crédito, Pix ou Boleto.</p>
                                        </div>
                                    </div>
                                </div>
                            </CheckoutSection>
                        </div> 

                        <div className="lg:col-span-1">
                             <div className="bg-gray-900 rounded-lg border border-gray-800 p-5 lg:p-6 shadow-lg h-fit lg:sticky lg:top-24">
                                <h2 className="text-xl font-bold mb-5 text-amber-400 border-b border-gray-700 pb-3">Resumo do Pedido</h2>
                                <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-2">
                                    {cart.map(item => (
                                        <div key={item.cartItemId} className="flex justify-between items-center text-gray-300 text-sm py-1 gap-2">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                 <img src={getFirstImage(item.images)} alt={item.name} className="w-10 h-10 object-contain bg-white rounded flex-shrink-0"/>
                                                <span className="truncate flex-grow">{item.qty}x {item.name} {item.variation ? `(${item.variation.size})` : ''}</span>
                                            </div>
                                            <span className="font-medium flex-shrink-0">R$&nbsp;{( (Number(item.is_on_sale && item.sale_price ? item.sale_price : item.price) || 0) * (Number(item.qty) || 0) ).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-gray-700 pt-4 space-y-2 text-sm">
                                    <div className="flex justify-between text-gray-400"><span>Subtotal</span><span className="font-medium text-gray-300">R$&nbsp;{subtotal.toFixed(2)}</span></div>
                                    {autoCalculatedShipping ? (
                                        <div className="flex justify-between text-gray-400">
                                            <span>Frete ({getShippingName(autoCalculatedShipping.name)})</span>
                                            <span className="font-medium text-gray-300">{shippingCost > 0 ? `R$ ${shippingCost.toFixed(2)}` : 'Grátis'}</span>
                                        </div>
                                    ) : (
                                        <div className="text-gray-500 text-center py-1">Calcule o frete</div>
                                    )}
                                    {appliedCoupon && (
                                        <div className="flex justify-between text-green-400">
                                            <span>Desconto ({appliedCoupon.code})</span>
                                            <span className="font-medium">- R$&nbsp;{discount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-bold text-lg text-white border-t border-gray-700 pt-3 mt-3">
                                        <span>Total</span>
                                        <span className="text-amber-400">R$&nbsp;{total.toFixed(2)}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handlePlaceOrderAndPay}
                                    disabled={(!canPlaceOrder && !autoCalculatedShipping?.isPickup) || !paymentMethod || !autoCalculatedShipping || isLoading}
                                    className={`w-full mt-6 py-3 rounded-md font-bold text-lg shadow-md transition-all duration-300 flex items-center justify-center gap-2
                                        ${(!canPlaceOrder && !autoCalculatedShipping?.isPickup) || !paymentMethod || !autoCalculatedShipping || isLoading 
                                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                                            : 'bg-gradient-to-r from-amber-400 to-amber-500 text-black hover:from-amber-300 hover:to-amber-400 hover:shadow-lg'
                                        }`}
                                >
                                    {isLoading ? <SpinnerIcon className="h-6 w-6"/> : <CheckBadgeIcon className="h-6 w-6"/>}
                                    {isLoading ? 'Processando...' : 'Finalizar e Pagar'}
                                </button>
                                {(!canPlaceOrder && !autoCalculatedShipping?.isPickup && !isLoading) && (
                                    <p className="text-red-400 text-xs text-center mt-3 font-semibold">
                                        ⚠️ Complete o endereço de entrega para continuar.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

const OrderSuccessPage = ({ orderId, onNavigate }) => {
    const { clearOrderState } = useShop();
    const notification = useNotification();
    const [pageStatus, setPageStatus] = useState('processing'); // 'processing', 'success', 'timeout', 'pending_action'
    const [finalOrderStatus, setFinalOrderStatus] = useState('');
    const [isRetryingPayment, setIsRetryingPayment] = useState(false);

    const statusRef = useRef(pageStatus);
    const pollsCount = useRef(0);

    useEffect(() => {
        statusRef.current = pageStatus;
    }, [pageStatus]);

    const pollStatus = useCallback(async () => {
        console.log(`Verificando status do pedido #${orderId}...`);
        try {
            const response = await apiService(`/orders/${orderId}/status`);
            if (response.status && response.status !== 'Pendente') {
                setFinalOrderStatus(response.status);
                setPageStatus('success');
                return true; 
            }
        } catch (err) {
            console.error("Erro ao verificar status, continuando a verificação.", err);
        }
        return false; 
    }, [orderId]);

    const handleRetryPayment = async () => {
        setIsRetryingPayment(true);
        try {
            const paymentResult = await apiService('/create-mercadopago-payment', 'POST', { orderId });
            if (paymentResult && paymentResult.init_point) {
                // Usa assign para navegação, mas o estado de loading será limpo pelo useEffect abaixo se o usuário voltar
                window.location.assign(paymentResult.init_point);
            } else {
                throw new Error("Não foi possível obter o link de pagamento.");
            }
        } catch (error) {
            notification.show(`Erro ao tentar abrir o pagamento: ${error.message}`, 'error');
            setIsRetryingPayment(false);
        }
    };

    const handleManualCheck = async () => {
        setPageStatus('processing');
        const isFinished = await pollStatus();
        if (!isFinished) {
            setTimeout(() => {
                 if (statusRef.current !== 'success') {
                    setPageStatus('pending_action');
                    notification.show("O pagamento ainda não foi confirmado. Aguarde alguns instantes.", "error");
                 }
            }, 2000);
        }
    };

    // --- Reset automático do botão de pagamento ao retornar à aba ---
    useEffect(() => {
        const resetPaymentState = () => {
            if (document.visibilityState === 'visible') {
                setIsRetryingPayment(false);
            }
        };

        window.addEventListener('focus', resetPaymentState);
        window.addEventListener('pageshow', resetPaymentState);
        document.addEventListener('visibilitychange', resetPaymentState);

        return () => {
            window.removeEventListener('focus', resetPaymentState);
            window.removeEventListener('pageshow', resetPaymentState);
            document.removeEventListener('visibilitychange', resetPaymentState);
        };
    }, []);

    useEffect(() => {
        // Limpa o estado do carrinho
        clearOrderState(); 
        
        // --- CORREÇÃO DE FLUXO ---
        // Remove a flag de pedido pendente assim que esta página carrega com sucesso.
        // Isso impede que o AppContent redirecione o usuário de volta para cá
        // se ele tentar navegar para Home ou outras páginas.
        sessionStorage.removeItem('pendingOrderId');

        let pollInterval;
        let timeout;

        const forceCheck = () => {
            if (statusRef.current === 'processing' || statusRef.current === 'pending_action') {
                console.log("Forçando verificação de status (evento de visibilidade/foco)");
                setPageStatus('processing');
                pollStatus().then(isFinished => {
                    if (!isFinished) {
                         if (pollsCount.current > 2) {
                             setPageStatus('pending_action');
                         }
                    }
                });
            }
        };

        const startPolling = async () => {
            const isFinished = await pollStatus();
            if (isFinished) return; 

            pollInterval = setInterval(async () => {
                 pollsCount.current += 1;
                 const finished = await pollStatus();
                 if (finished) {
                     clearInterval(pollInterval);
                     clearTimeout(timeout);
                 } else if (pollsCount.current >= 4 && statusRef.current === 'processing') {
                     setPageStatus('pending_action');
                 }
            }, 5000);
            
            timeout = setTimeout(() => {
                clearInterval(pollInterval);
                if (statusRef.current === 'processing') {
                    setPageStatus('timeout');
                }
            }, 60000);
        };

        startPolling();

        window.addEventListener('focus', forceCheck);
        window.addEventListener('pageshow', forceCheck);
        document.addEventListener('visibilitychange', forceCheck);

        return () => {
            clearInterval(pollInterval);
            clearTimeout(timeout);
            window.removeEventListener('focus', forceCheck);
            window.removeEventListener('pageshow', forceCheck);
            document.removeEventListener('visibilitychange', forceCheck);
        };
    }, [orderId, clearOrderState, pollStatus]); 


    const renderContent = () => {
        switch (pageStatus) {
            case 'success':
                return {
                    icon: <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />,
                    title: "Pagamento Aprovado!",
                    message: `Seu pedido #${orderId} foi confirmado e está com o status "${finalOrderStatus}". Já estamos preparando tudo para o envio!`,
                    actions: (
                        <button onClick={() => onNavigate('account')} className="bg-amber-500 text-black px-6 py-3 rounded-md font-bold hover:bg-amber-400 w-full sm:w-auto">Ver Meus Pedidos</button>
                    )
                };
            case 'pending_action':
                return {
                    icon: <ExclamationCircleIcon className="h-16 w-16 text-amber-500 mx-auto mb-4" />,
                    title: "Aguardando Pagamento",
                    message: `Ainda não recebemos a confirmação do pagamento para o pedido #${orderId}. Se você fechou a janela do Mercado Pago, clique abaixo para pagar.`,
                    actions: (
                        <div className="flex flex-col gap-3 w-full sm:w-auto">
                             <button 
                                onClick={handleRetryPayment} 
                                disabled={isRetryingPayment}
                                className={`px-6 py-3 rounded-md font-bold flex items-center justify-center gap-2 w-full transition-colors ${isRetryingPayment ? 'bg-green-700 text-gray-200 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                            >
                                {isRetryingPayment ? <SpinnerIcon className="h-5 w-5"/> : <CreditCardIcon className="h-5 w-5"/>}
                                {isRetryingPayment ? 'Abrindo...' : 'Realizar Pagamento'}
                            </button>
                            <button 
                                onClick={handleManualCheck} 
                                className="bg-gray-700 text-white px-6 py-3 rounded-md font-bold hover:bg-gray-600 w-full"
                            >
                                Já Paguei (Atualizar)
                            </button>
                        </div>
                    )
                };
            case 'timeout':
                return {
                    icon: <ClockIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />,
                    title: "Processando...",
                    message: `Seu pedido #${orderId} foi recebido. Estamos aguardando a confirmação do banco. Você pode verificar o status a qualquer momento em "Meus Pedidos".`,
                    actions: (
                        <button onClick={() => onNavigate('account')} className="bg-amber-500 text-black px-6 py-3 rounded-md font-bold hover:bg-amber-400 w-full sm:w-auto">Ir para Meus Pedidos</button>
                    )
                };
            case 'processing':
            default:
                return {
                    icon: (
                        <div className="relative mb-6">
                            <SpinnerIcon className="h-16 w-16 text-amber-500 mx-auto animate-spin" />
                        </div>
                    ),
                    title: "Confirmando Pagamento...",
                    message: "Aguarde um instante, estamos confirmando seu pagamento com a operadora.",
                    actions: null
                };
        }
    };

    const { icon, title, message, actions } = renderContent();

    return (
        <div className="bg-black text-white min-h-screen flex items-center justify-center p-4">
            <div className="text-center p-8 bg-gray-900 rounded-lg shadow-lg border border-gray-800 max-w-lg w-full">
                {icon}
                <h1 className="text-2xl sm:text-3xl font-bold text-amber-400 mb-4">{title}</h1>
                <p className="text-gray-300 mb-8 leading-relaxed">{message}</p>
                
                <div className="flex flex-col items-center gap-4">
                    {actions}
                    {pageStatus !== 'processing' && (
                        <button onClick={() => onNavigate('home')} className="text-gray-500 hover:text-white underline text-sm mt-2">
                            Voltar à Página Inicial
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const OrderStatusTimeline = ({ history, currentStatus, onStatusClick }) => {
    const STATUS_DEFINITIONS = useMemo(() => ({
        'Pendente': { title: 'Pedido Pendente', description: 'Aguardando a confirmação do pagamento. Se você pagou com boleto, pode levar até 2 dias úteis.', icon: <ClockIcon className="h-6 w-6" />, color: 'amber' },
        'Pagamento Aprovado': { title: 'Pagamento Aprovado', description: 'Recebemos seu pagamento! Agora, estamos preparando seu pedido para o envio.', icon: <CheckBadgeIcon className="h-6 w-6" />, color: 'green' },
        'Pagamento Recusado': { title: 'Pagamento Recusado', description: 'A operadora não autorizou o pagamento. Por favor, tente novamente ou use outra forma de pagamento.', icon: <XCircleIcon className="h-6 w-6" />, color: 'red' },
        'Separando Pedido': { title: 'Separando Pedido', description: 'Seu pedido está sendo cuidadosamente separado e embalado em nosso estoque.', icon: <PackageIcon className="h-6 w-6" />, color: 'blue' },
        'Enviado': { title: 'Pedido Enviado', description: 'Seu pedido foi coletado pela transportadora e está a caminho do seu endereço. Use o código de rastreio para acompanhar.', icon: <TruckIcon className="h-6 w-6" />, color: 'blue' },
        'Saiu para Entrega': { title: 'Saiu para Entrega', description: 'O carteiro ou entregador saiu com sua encomenda para fazer a entrega no seu endereço hoje.', icon: <TruckIcon className="h-6 w-6" />, color: 'blue' },
        'Entregue': { title: 'Pedido Entregue', description: 'Seu pedido foi entregue com sucesso! Esperamos que goste.', icon: <HomeIcon className="h-6 w-6" />, color: 'green' },
        'Cancelado': { title: 'Pedido Cancelado', description: 'Este pedido foi cancelado. Se tiver alguma dúvida, entre em contato conosco.', icon: <XCircleIcon className="h-6 w-6" />, color: 'red' },
        'Reembolsado': { title: 'Pedido Reembolsado', description: 'O valor deste pedido foi estornado. O prazo para aparecer na sua fatura depende da operadora do cartão.', icon: <CurrencyDollarIcon className="h-6 w-6" />, color: 'gray' }
    }), []);

    const colorClasses = useMemo(() => ({
        amber: { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500' },
        green: { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500' },
        blue:  { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500' },
        red:   { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500' },
        gray:  { bg: 'bg-gray-700', text: 'text-gray-500', border: 'border-gray-600' }
    }), []);
    
    const timelineOrder = useMemo(() => [
        'Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Enviado', 'Saiu para Entrega', 'Entregue'
    ], []);

    // FILTRO DE SEGURANÇA: Garante que o histórico seja sempre uma lista válida de objetos com status.
    const historyMap = useMemo(() =>
        new Map(
            (Array.isArray(history) ? history : [])
                .filter(h => h && typeof h === 'object' && h.status)
                .map(h => [h.status, h])
        )
    , [history]);
    
    const currentStatusIndex = timelineOrder.indexOf(currentStatus);

    if (['Cancelado', 'Pagamento Recusado', 'Reembolsado'].includes(currentStatus)) {
        const specialStatus = STATUS_DEFINITIONS[currentStatus];
        if (!specialStatus) return <div className="p-4 bg-red-100 text-red-700 rounded-md">Status desconhecido: {currentStatus}</div>;

        const specialClasses = colorClasses[specialStatus.color] || colorClasses.gray;
        return (
            <div className="p-4 bg-gray-800 rounded-lg">
                <div onClick={() => onStatusClick(specialStatus)} className="flex items-center gap-4 cursor-pointer">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${specialClasses.bg} text-white`}>
                        {React.cloneElement(specialStatus.icon, { className: 'h-7 w-7'})}
                    </div>
                    <div>
                        <h4 className={`font-bold text-lg ${specialClasses.text}`}>{specialStatus.title}</h4>
                        <p className="text-sm text-gray-400">Clique para ver mais detalhes</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* --- VISTA DESKTOP --- */}
            <div className="hidden md:flex justify-between items-center flex-wrap gap-2">
                {timelineOrder.map((statusKey, index) => {
                    const statusInfo = historyMap.get(statusKey);
                    const isStepActive = index <= currentStatusIndex;
                    const isCurrent = statusKey === currentStatus;
                    const definition = STATUS_DEFINITIONS[statusKey];
                    if (!definition) return null;
                    const currentClasses = isStepActive ? colorClasses[definition.color] : colorClasses.gray;
                    
                    return (
                        <React.Fragment key={statusKey}>
                            <div 
                                className={`flex flex-col items-center ${isStepActive && statusInfo ? 'cursor-pointer group' : 'cursor-default'}`} 
                                onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                <div className={`relative w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${currentClasses.bg} ${currentClasses.border} ${isCurrent ? 'animate-pulse' : ''}`}>
                                    {React.cloneElement(definition.icon, { className: 'h-5 w-5 text-white' })}
                                </div>
                                <p className={`mt-2 text-xs text-center font-semibold transition-all ${currentClasses.text}`}>{definition.title}</p>
                                {statusInfo && isStepActive && (<p className="text-xs text-gray-500">{new Date(statusInfo.status_date).toLocaleDateString('pt-BR')}</p>)}
                            </div>
                            {index < timelineOrder.length - 1 && <div className={`flex-1 h-1 transition-colors ${isStepActive ? currentClasses.bg : colorClasses.gray.bg}`}></div>}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* --- VISTA MOBILE --- */}
            <div className="md:hidden flex flex-col">
                {timelineOrder.map((statusKey, index) => {
                    const statusInfo = historyMap.get(statusKey);
                    const isStepActive = index <= currentStatusIndex;
                    const isCurrent = statusKey === currentStatus;
                    const definition = STATUS_DEFINITIONS[statusKey];
                    if (!definition) return null;
                    const currentClasses = isStepActive ? colorClasses[definition.color] : colorClasses.gray;

                    return (
                        <div key={statusKey} className="flex">
                            <div className="flex flex-col items-center mr-4">
                                <div 
                                    className={`relative w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all ${currentClasses.bg} ${currentClasses.border} ${isCurrent ? 'animate-pulse' : ''} ${isStepActive && statusInfo ? 'cursor-pointer' : 'cursor-default'}`}
                                    onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                    {React.cloneElement(definition.icon, { className: 'h-5 w-5 text-white' })}
                                </div>
                                {index < timelineOrder.length - 1 && <div className={`w-px flex-grow transition-colors my-1 ${index < currentStatusIndex ? currentClasses.bg : colorClasses.gray.bg}`}></div>}
                            </div>
                            <div 
                                className={`pt-1.5 pb-8 ${isStepActive && statusInfo ? 'cursor-pointer' : 'cursor-default'}`}
                                onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                <p className={`font-semibold transition-all ${currentClasses.text}`}>{definition.title}</p>
                                {statusInfo && isStepActive && (<p className="text-xs text-gray-500">{new Date(statusInfo.status_date).toLocaleString('pt-BR')}</p>)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const PickupOrderStatusTimeline = ({ history, currentStatus, onStatusClick }) => {
    const STATUS_DEFINITIONS = useMemo(() => ({
        'Pendente': { title: 'Pedido Pendente', description: 'Aguardando a confirmação do pagamento.', icon: <ClockIcon className="h-6 w-6" />, color: 'amber' },
        'Pagamento Aprovado': { title: 'Pagamento Aprovado', description: 'Recebemos seu pagamento! Agora, estamos preparando seu pedido.', icon: <CheckBadgeIcon className="h-6 w-6" />, color: 'green' },
        'Pagamento Recusado': { title: 'Pagamento Recusado', description: 'A operadora não autorizou o pagamento. Por favor, tente novamente ou use outra forma de pagamento.', icon: <XCircleIcon className="h-6 w-6" />, color: 'red' },
        'Separando Pedido': { title: 'Separando Pedido', description: 'Seu pedido está sendo cuidadosamente separado e embalado.', icon: <PackageIcon className="h-6 w-6" />, color: 'blue' },
        'Pronto para Retirada': { title: 'Pronto para Retirada', description: 'Seu pedido está pronto! Você já pode vir retirá-lo em nosso endereço dentro do horário de funcionamento.', icon: <CheckCircleIcon className="h-6 w-6" />, color: 'blue' },
        'Entregue': { title: 'Pedido Retirado', description: 'Seu pedido foi retirado com sucesso! Esperamos que goste.', icon: <HomeIcon className="h-6 w-6" />, color: 'green' },
        'Cancelado': { title: 'Pedido Cancelado', description: 'Este pedido foi cancelado. Se tiver alguma dúvida, entre em contato conosco.', icon: <XCircleIcon className="h-6 w-6" />, color: 'red' },
        'Reembolsado': { title: 'Pedido Reembolsado', description: 'O valor deste pedido foi estornado.', icon: <CurrencyDollarIcon className="h-6 w-6" />, color: 'gray' }
    }), []);

    const colorClasses = useMemo(() => ({
        amber: { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500' },
        green: { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500' },
        blue:  { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500' },
        red:   { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500' },
        gray:  { bg: 'bg-gray-700', text: 'text-gray-500', border: 'border-gray-600' }
    }), []);
    
    const timelineOrder = useMemo(() => [
        'Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Pronto para Retirada', 'Entregue'
    ], []);

    // FILTRO DE SEGURANÇA: Garante que o histórico seja sempre uma lista válida de objetos com status.
    const historyMap = useMemo(() =>
        new Map(
            (Array.isArray(history) ? history : [])
                .filter(h => h && typeof h === 'object' && h.status)
                .map(h => [h.status, h])
        )
    , [history]);

    const currentStatusIndex = timelineOrder.indexOf(currentStatus);

    if (['Cancelado', 'Pagamento Recusado', 'Reembolsado'].includes(currentStatus)) {
        const specialStatus = STATUS_DEFINITIONS[currentStatus];
        if (!specialStatus) return <div className="p-4 bg-red-100 text-red-700 rounded-md">Status desconhecido: {currentStatus}</div>;
        
        const specialClasses = colorClasses[specialStatus.color] || colorClasses.gray;
        return (
            <div className="p-4 bg-gray-800 rounded-lg">
                <div onClick={() => onStatusClick(specialStatus)} className="flex items-center gap-4 cursor-pointer">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${specialClasses.bg} text-white`}>
                        {React.cloneElement(specialStatus.icon, { className: 'h-7 w-7'})}
                    </div>
                    <div>
                        <h4 className={`font-bold text-lg ${specialClasses.text}`}>{specialStatus.title}</h4>
                        <p className="text-sm text-gray-400">Clique para ver mais detalhes</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* --- VISTA DESKTOP --- */}
            <div className="hidden md:flex justify-between items-center flex-wrap gap-2">
                {timelineOrder.map((statusKey, index) => {
                    const statusInfo = historyMap.get(statusKey);
                    const isStepActive = index <= currentStatusIndex;
                    const isCurrent = statusKey === currentStatus;
                    const definition = STATUS_DEFINITIONS[statusKey];
                    if (!definition) return null;
                    const currentClasses = isStepActive ? colorClasses[definition.color] : colorClasses.gray;
                    
                    return (
                        <React.Fragment key={statusKey}>
                            <div 
                                className={`flex flex-col items-center ${isStepActive && statusInfo ? 'cursor-pointer group' : 'cursor-default'}`} 
                                onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                <div className={`relative w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${currentClasses.bg} ${currentClasses.border} ${isCurrent ? 'animate-pulse' : ''}`}>
                                    {React.cloneElement(definition.icon, { className: 'h-5 w-5 text-white' })}
                                </div>
                                <p className={`mt-2 text-xs text-center font-semibold transition-all ${currentClasses.text}`}>{definition.title}</p>
                                {statusInfo && isStepActive && (<p className="text-xs text-gray-500">{new Date(statusInfo.status_date).toLocaleDateString('pt-BR')}</p>)}
                            </div>
                            {index < timelineOrder.length - 1 && <div className={`flex-1 h-1 transition-colors ${isStepActive ? currentClasses.bg : colorClasses.gray.bg}`}></div>}
                        </React.Fragment>
                    );
                })}
            </div>
            {/* --- VISTA MOBILE --- */}
            <div className="md:hidden flex flex-col">
                {timelineOrder.map((statusKey, index) => {
                    const statusInfo = historyMap.get(statusKey);
                    const isStepActive = index <= currentStatusIndex;
                    const isCurrent = statusKey === currentStatus;
                    const definition = STATUS_DEFINITIONS[statusKey];
                    if (!definition) return null;
                    const currentClasses = isStepActive ? colorClasses[definition.color] : colorClasses.gray;

                    return (
                        <div key={statusKey} className="flex">
                            <div className="flex flex-col items-center mr-4">
                                <div 
                                    className={`relative w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all ${currentClasses.bg} ${currentClasses.border} ${isCurrent ? 'animate-pulse' : ''} ${isStepActive && statusInfo ? 'cursor-pointer' : 'cursor-default'}`}
                                    onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                    {React.cloneElement(definition.icon, { className: 'h-5 w-5 text-white' })}
                                </div>
                                {index < timelineOrder.length - 1 && <div className={`w-px flex-grow transition-colors my-1 ${index < currentStatusIndex ? currentClasses.bg : colorClasses.gray.bg}`}></div>}
                            </div>
                            <div 
                                className={`pt-1.5 pb-8 ${isStepActive && statusInfo ? 'cursor-pointer' : 'cursor-default'}`}
                                onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                <p className={`font-semibold transition-all ${currentClasses.text}`}>{definition.title}</p>
                                {statusInfo && isStepActive && (<p className="text-xs text-gray-500">{new Date(statusInfo.status_date).toLocaleString('pt-BR')}</p>)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


const StatusDescriptionModal = ({ isOpen, onClose, details }) => {
    if (!isOpen || !details) return null;

    const colorMap = {
        amber: { bg: 'bg-amber-100', icon: 'text-amber-600', title: 'text-amber-800' },
        green: { bg: 'bg-green-100', icon: 'text-green-600', title: 'text-green-800' },
        blue:  { bg: 'bg-blue-100', icon: 'text-blue-600', title: 'text-blue-800' },
        red:   { bg: 'bg-red-100', icon: 'text-red-600', title: 'text-red-800' },
        gray:  { bg: 'bg-gray-100', icon: 'text-gray-600', title: 'text-gray-800' }
    };

    const theme = colorMap[details.color] || colorMap.gray;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Status">
             <div className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${theme.bg} ${theme.icon} mb-4`}>
                    {React.cloneElement(details.icon, { className: 'h-8 w-8' })}
                </div>
                <h3 className={`text-xl font-bold ${theme.title} mb-2`}>{details.title}</h3>
                <p className="text-gray-600">{details.description}</p>
            </div>
        </Modal>
    );
};

const ProductReviewForm = ({ productId, orderId, onReviewSubmitted }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const notification = useNotification();
    const MAX_COMMENT_LENGTH = 500;

    const handleCommentChange = (e) => {
        setComment(e.target.value.slice(0, MAX_COMMENT_LENGTH));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            notification.show("Por favor, selecione uma nota clicando nas estrelas.", 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            await apiService(`/reviews`, 'POST', {
                product_id: productId,
                order_id: orderId,
                rating: rating,
                comment: comment,
            });
            notification.show("Avaliação enviada com sucesso!");
            if (onReviewSubmitted) {
                onReviewSubmitted();
            }
        } catch (error) {
            notification.show(error.message || "Não foi possível enviar sua avaliação.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 text-gray-800">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sua Nota</label>
                <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                        <StarIcon key={i} onClick={() => setRating(i + 1)} className={`h-8 w-8 cursor-pointer ${i < rating ? 'text-amber-400' : 'text-gray-400 hover:text-amber-300'}`} isFilled={i < rating} />
                    ))}
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seu Comentário (opcional)</label>
                <textarea 
                    value={comment} 
                    onChange={handleCommentChange} 
                    placeholder="Conte o que você achou do produto..." 
                    className="w-full p-2 border border-gray-300 rounded-md h-24 bg-white"
                    maxLength={MAX_COMMENT_LENGTH}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                    {comment.length} / {MAX_COMMENT_LENGTH}
                </div>
            </div>
            <div className="flex justify-end pt-4">
                <button type="submit" disabled={isSubmitting} className="bg-gray-800 text-white font-bold py-2 px-6 rounded-md hover:bg-gray-900 disabled:bg-gray-400 flex items-center justify-center">
                    {isSubmitting ? <SpinnerIcon /> : "Enviar Avaliação"}
                </button>
            </div>
        </form>
    );
};

const OrderDetailPage = ({ onNavigate, orderId }) => {
    // --- ATUALIZAÇÃO: Extraindo 'logout' do hook useAuth ---
    const { user, logout } = useAuth(); 
    const { addToCart, markOrderAsSeen } = useShop(); 
    const notification = useNotification();
    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPaying, setIsPaying] = useState(false);
    const [isItemsExpanded, setIsItemsExpanded] = useState(true);
    
    const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedStatusDetails, setSelectedStatusDetails] = useState(null);
    
    const [reviewingItem, setReviewingItem] = useState(null);
    
    // --- Estados para o Modal de Reembolso/Cancelamento do Cliente ---
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [refundReason, setRefundReason] = useState('');
    const [isProcessingRefund, setIsProcessingRefund] = useState(false);

    // --- NOVO: Marca o pedido como visto ao montar o componente ---
    useEffect(() => {
        if (orderId) {
            markOrderAsSeen(orderId);
        }
    }, [orderId, markOrderAsSeen]);

    const fetchOrderDetails = useCallback(() => {
        setIsLoading(true);
        // Adiciona timestamp para evitar cache do navegador
        return apiService(`/orders/my-orders?id=${orderId}&t=${new Date().getTime()}`)
            .then(data => {
                if (data && data.length > 0) {
                    setOrder(data[0]);
                } else {
                    // Se a API retornar array vazio, significa que não encontrou para este usuário
                    setOrder(null);
                }
            })
            .catch(err => {
                console.error(err);
            })
            .finally(() => setIsLoading(false));
    }, [orderId]);

    useEffect(() => {
        fetchOrderDetails();
    }, [fetchOrderDetails]);

    const handleReviewSuccess = () => {
        setReviewingItem(null);
        fetchOrderDetails();
    };

    const handleOpenStatusModal = (statusDetails) => {
        setSelectedStatusDetails(statusDetails);
        setIsStatusModalOpen(true);
    };

    const handleRetryPayment = async (orderId) => {
        setIsPaying(true);
        try {
            const paymentResult = await apiService('/create-mercadopago-payment', 'POST', { orderId });
            if (paymentResult && paymentResult.init_point) {
                sessionStorage.setItem('pendingOrderId', orderId);
                window.location.href = paymentResult.init_point;
            } else { throw new Error("Não foi possível obter o link de pagamento."); }
        } catch (error) {
            notification.show(`Erro ao tentar realizar o pagamento: ${error.message}`, 'error');
        } finally {
            setIsPaying(false);
        }
    };

    const handleRepeatOrder = (orderItems) => {
        if (!orderItems) return;
        
        const promises = (Array.isArray(orderItems) ? orderItems : []).map(item => {
            if (item.product_type === 'clothing') {
                notification.show(`Para adicionar "${item.name}" novamente, por favor, visite a página do produto.`, 'error');
                return Promise.resolve(0);
            }
            const product = { id: item.product_id, name: item.name, price: item.price, images: item.images, stock: item.stock, variations: item.variations, is_on_sale: item.is_on_sale, sale_price: item.sale_price };
            return addToCart(product, item.quantity, item.variation)
                .then(() => 1) 
                .catch(err => {
                    notification.show(`Não foi possível adicionar "${item.name}": ${err.message}`, 'error');
                    return 0; 
                });
        });

        Promise.all(promises).then(results => {
            const count = results.reduce((sum, val) => sum + val, 0);
            if (count > 0) {
                notification.show(`${count} item(ns) adicionado(s) ao carrinho!`);
                onNavigate('cart');
            }
        });
    };
    
    const handleRequestRefund = async (e) => {
        e.preventDefault();
        setIsProcessingRefund(true);
        try {
            const result = await apiService('/refunds/request', 'POST', {
                order_id: order.id,
                reason: refundReason
            });
            notification.show(result.message);
            setIsRefundModalOpen(false);
            setRefundReason('');
            fetchOrderDetails(); // ATUALIZA A TELA IMEDIATAMENTE
        } catch (error) {
            notification.show(`Erro ao solicitar: ${error.message}`, 'error');
        } finally {
            setIsProcessingRefund(false);
        }
    };

    const getCardIcon = (brand) => {
        const lowerBrand = brand ? brand.toLowerCase() : '';
        switch (lowerBrand) {
            case 'visa': return VisaIcon;
            case 'master':
            case 'mastercard': return MastercardIcon;
            case 'elo': return EloIcon;
            default: return CreditCardIcon;
        }
    };
    
    const getRefundStatusInfo = (status) => {
        const statuses = {
            'pending_approval': { text: 'Cancelamento em análise', class: 'text-yellow-400 bg-yellow-900/50', icon: <ClockIcon className="h-4 w-4"/> },
            'processed': { text: 'Reembolso Concluído', class: 'text-green-400 bg-green-900/50', icon: <CheckCircleIcon className="h-4 w-4"/> },
            'denied': { text: 'Solicitação Negada', class: 'text-red-400 bg-red-900/50', icon: <XCircleIcon className="h-4 w-4"/> },
            'failed': { text: 'Falha no Reembolso', class: 'text-red-400 bg-red-900/50', icon: <ExclamationCircleIcon className="h-4 w-4"/> }
        };
        // Ajuste para pedidos entregues
        if (order && order.status === 'Entregue' && status === 'pending_approval') {
            statuses['pending_approval'].text = 'Reembolso em análise';
        }
        return statuses[status] || { text: `Status: ${status}`, class: 'text-gray-400 bg-gray-700', icon: null };
    };

    const renderPaymentDetails = () => {
        if (!order || !order.payment_method) {
            return <p className="text-sm text-gray-400">Informação de pagamento não disponível.</p>;
        }

        const paymentDetails = order.payment_details ? JSON.parse(order.payment_details) : null;

        if (paymentDetails) {
            if (paymentDetails.method === 'pix') {
                return (
                    <div className="flex items-center gap-3">
                        <PixIcon className="h-7 w-7 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-white">Pagamento via Pix</p>
                            <p className="text-sm text-gray-400">Confirmado via Mercado Pago.</p>
                        </div>
                    </div>
                );
            }
            if (paymentDetails.method === 'credit_card' && paymentDetails.card_last_four) {
                const CardIconComponent = getCardIcon(paymentDetails.card_brand);
                return (
                     <div className="flex items-center gap-3">
                        <CardIconComponent className="h-8 w-8 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-white capitalize">{paymentDetails.card_brand || 'Cartão de Crédito'} final {paymentDetails.card_last_four}</p>
                            <p className="text-sm text-gray-400">
                                {paymentDetails.installments > 1 
                                    ? `Pagamento em ${paymentDetails.installments}x de R$ ${(Number(order.total) / paymentDetails.installments).toFixed(2).replace('.', ',')}`
                                    : 'Pagamento em 1x (à vista)'
                                }
                            </p>
                        </div>
                    </div>
                );
            }
            if (paymentDetails.method === 'boleto') {
                return (
                    <div className="flex items-center gap-3">
                        <BoletoIcon className="h-7 w-7 text-gray-300 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-white">Boleto Bancário</p>
                            <p className="text-sm text-gray-400">Confirmado via Mercado Pago.</p>
                        </div>
                    </div>
                );
            }
        }

        return (
            <div className="flex items-center gap-3">
                <CreditCardIcon className="h-7 w-7 text-gray-300 flex-shrink-0" />
                <div>
                    <p className="font-semibold text-white">Pagamento via Mercado Pago</p>
                    <p className="text-sm text-gray-400 capitalize">{paymentDetails?.method || 'Detalhes não disponíveis'}</p>
                </div>
            </div>
        );
    };

    if (isLoading) return <div className="flex justify-center items-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-400 animate-spin"/></div>;
    
    // --- UI PARA PEDIDO NÃO ENCONTRADO ---
    if (!order) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center min-h-[60vh]">
                <div className="bg-gray-900 p-6 rounded-full mb-6 border-2 border-gray-800 shadow-xl">
                    <ExclamationCircleIcon className="h-16 w-16 text-gray-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Pedido não encontrado</h2>
                <p className="text-gray-400 mb-8 max-w-md leading-relaxed">
                    Não conseguimos localizar este pedido. Isso pode acontecer se você estiver logado em uma conta diferente da que realizou a compra.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                    <button 
                        onClick={() => { logout(); onNavigate('login'); }} 
                        className="flex-1 px-6 py-3 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition-colors shadow-lg flex items-center justify-center gap-2"
                    >
                        <UserIcon className="h-5 w-5"/>
                        Sair e Trocar de Conta
                    </button>
                    <button 
                        onClick={() => onNavigate('home')} 
                        className="flex-1 px-6 py-3 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-700 transition-colors border border-gray-700"
                    >
                        Voltar ao Início
                    </button>
                </div>
            </div>
        );
    }

    const isPickupOrder = order.shipping_method === 'Retirar na loja';
    const isLocalDelivery = order.shipping_method && order.shipping_method.includes('Motoboy'); 
    const pickupDetails = isPickupOrder && order.pickup_details ? JSON.parse(order.pickup_details) : null;
    const safeHistory = Array.isArray(order.history) ? order.history : [];
    const shippingAddress = !isPickupOrder && order.shipping_address ? JSON.parse(order.shipping_address) : null;
    const subtotal = (Number(order.total) || 0) - (Number(order.shipping_cost) || 0) + (Number(order.discount_amount) || 0);
    
    const cancellableStatuses = ['Pagamento Aprovado', 'Separando Pedido', 'Entregue'];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const isWithinRefundPeriod = new Date(order.date) > thirtyDaysAgo;
    
    // --- LÓGICA DE REEMBOLSO ATUALIZADA E CORRIGIDA ---
    const refundStatus = order.refund_status;
    const isRefundDenied = refundStatus === 'denied';
    
    // Verifica se existe nota de negação (pode vir como refund_notes ou notes da tabela refunds)
    const refundDeniedReason = order.refund_notes || "Motivo não informado pelo administrador."; 

    const canRequest = 
        order.payment_status === 'approved' && 
        cancellableStatuses.includes(order.status) && 
        (!order.refund_id || isRefundDenied) && // Permite se não tem solicitação OU se a anterior foi negada
        (order.status !== 'Entregue' || isWithinRefundPeriod);
        
    const actionText = order.status === 'Entregue' ? 'Reembolso' : 'Cancelamento';
    
    const refundInfo = order.refund_id ? getRefundStatusInfo(order.refund_status) : null;
    const isOrderInactive = ['Cancelado', 'Reembolsado', 'Pagamento Recusado'].includes(order.status);

    const LocalDeliveryTimeline = ({ history, currentStatus, onStatusClick }) => {
        // ... (Mesma lógica de timeline)
        const displayLabels = {
            'Pendente': 'Pedido Pendente',
            'Pagamento Aprovado': 'Pagamento Aprovado',
            'Separando Pedido': 'Preparado o pedido para envio',
            'Saiu para Entrega': 'Saiu para entrega (Motoboy)',
            'Entregue': 'Pedido entregue',
            'Reembolsado': 'Pedido Reembolsado',
            'Cancelado': 'Pedido Cancelado',
            'Pagamento Recusado': 'Pagamento Recusado'
        };

        const STATUS_DEFINITIONS = {
            'Pendente': { icon: <ClockIcon className="h-6 w-6" />, color: 'amber', title: displayLabels['Pendente'], description: 'Aguardando confirmação do pagamento.' },
            'Pagamento Aprovado': { icon: <CheckBadgeIcon className="h-6 w-6" />, color: 'green', title: displayLabels['Pagamento Aprovado'], description: 'Recebemos seu pagamento! Agora, estamos preparando seu pedido.' },
            'Separando Pedido': { icon: <PackageIcon className="h-6 w-6" />, color: 'blue', title: displayLabels['Separando Pedido'], description: 'Seu pedido está sendo separado e embalado.' },
            'Saiu para Entrega': { icon: <TruckIcon className="h-6 w-6" />, color: 'blue', title: displayLabels['Saiu para Entrega'], description: 'O motoboy/Uber saiu com seu pedido.' },
            'Entregue': { icon: <HomeIcon className="h-6 w-6" />, color: 'green', title: displayLabels['Entregue'], description: 'Pedido entregue com sucesso!' },
            'Reembolsado': { icon: <CurrencyDollarIcon className="h-6 w-6" />, color: 'gray', title: displayLabels['Reembolsado'], description: 'O valor foi estornado.' },
            'Cancelado': { icon: <XCircleIcon className="h-6 w-6" />, color: 'red', title: displayLabels['Cancelado'], description: 'Pedido cancelado.' },
            'Pagamento Recusado': { icon: <XCircleIcon className="h-6 w-6" />, color: 'red', title: displayLabels['Pagamento Recusado'], description: 'Pagamento não autorizado.' }
        };

        const colorClasses = {
            amber: { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500' },
            green: { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500' },
            blue:  { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500' },
            red:   { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500' },
            gray:  { bg: 'bg-gray-700', text: 'text-gray-500', border: 'border-gray-600' }
        };

        if (['Cancelado', 'Pagamento Recusado', 'Reembolsado'].includes(currentStatus)) {
            const specialStatus = STATUS_DEFINITIONS[currentStatus];
            const specialClasses = colorClasses[specialStatus.color] || colorClasses.gray;
            
            return (
                <div className="p-4 bg-gray-800 rounded-lg">
                    <div onClick={() => onStatusClick && onStatusClick(specialStatus)} className="flex items-center gap-4 cursor-pointer">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${specialClasses.bg} text-white`}>
                            {React.cloneElement(specialStatus.icon, { className: 'h-7 w-7'})}
                        </div>
                        <div>
                            <h4 className={`font-bold text-lg ${specialClasses.text}`}>{specialStatus.title}</h4>
                            <p className="text-sm text-gray-400">Clique para ver mais detalhes</p>
                        </div>
                    </div>
                </div>
            );
        }

        const timelineOrder = [
            'Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Saiu para Entrega', 'Entregue'
        ];

        const historyMap = new Map((Array.isArray(history) ? history : []).filter(h => h.status).map(h => [h.status, h]));
        const currentStatusIndex = timelineOrder.indexOf(currentStatus);

        return (
            <div className="w-full">
                <div className="hidden md:flex justify-between items-center flex-wrap gap-2">
                    {timelineOrder.map((statusKey, index) => {
                        const statusInfo = historyMap.get(statusKey);
                        const isStepActive = index <= currentStatusIndex;
                        const definition = STATUS_DEFINITIONS[statusKey];
                        if (!definition) return null;
                        const currentClasses = isStepActive ? colorClasses[definition.color] : colorClasses.gray;
                        
                        return (
                            <React.Fragment key={statusKey}>
                                <div 
                                    className={`flex flex-col items-center ${isStepActive && statusInfo ? 'cursor-pointer group' : 'cursor-default'}`} 
                                    onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                    <div className={`relative w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${currentClasses.bg} ${currentClasses.border} ${isStepActive ? 'animate-pulse' : ''}`}>
                                        {React.cloneElement(definition.icon, { className: 'h-5 w-5 text-white' })}
                                    </div>
                                    <p className={`mt-2 text-xs text-center font-semibold transition-all ${currentClasses.text}`}>{displayLabels[statusKey]}</p>
                                    {statusInfo && isStepActive && (<p className="text-xs text-gray-500">{new Date(statusInfo.status_date).toLocaleDateString('pt-BR')}</p>)}
                                </div>
                                {index < timelineOrder.length - 1 && <div className={`flex-1 h-1 transition-colors ${isStepActive ? currentClasses.bg : colorClasses.gray.bg}`}></div>}
                            </React.Fragment>
                        );
                    })}
                </div>
                <div className="md:hidden flex flex-col">
                    {timelineOrder.map((statusKey, index) => {
                        const statusInfo = historyMap.get(statusKey);
                        const isStepActive = index <= currentStatusIndex;
                        const definition = STATUS_DEFINITIONS[statusKey];
                        if (!definition) return null;
                        const currentClasses = isStepActive ? colorClasses[definition.color] : colorClasses.gray;

                        return (
                            <div key={statusKey} className="flex">
                                <div className="flex flex-col items-center mr-4">
                                    <div 
                                        className={`relative w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all ${currentClasses.bg} ${currentClasses.border} ${isStepActive && statusInfo ? 'cursor-pointer' : 'cursor-default'}`}
                                        onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                        {React.cloneElement(definition.icon, { className: 'h-5 w-5 text-white' })}
                                    </div>
                                    {index < timelineOrder.length - 1 && <div className={`w-px flex-grow transition-colors my-1 ${index < currentStatusIndex ? currentClasses.bg : colorClasses.gray.bg}`}></div>}
                                </div>
                                <div 
                                    className={`pt-1.5 pb-8 ${isStepActive && statusInfo ? 'cursor-pointer' : 'cursor-default'}`}
                                    onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                    <p className={`font-semibold transition-all ${currentClasses.text}`}>{displayLabels[statusKey]}</p>
                                    {statusInfo && isStepActive && (<p className="text-xs text-gray-500">{new Date(statusInfo.status_date).toLocaleString('pt-BR')}</p>)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <>
            <TrackingModal isOpen={isTrackingModalOpen} onClose={() => setIsTrackingModalOpen(false)} order={order} />
            <StatusDescriptionModal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} details={selectedStatusDetails} />
            <AnimatePresence>
                {reviewingItem && (
                    <Modal isOpen={true} onClose={() => setReviewingItem(null)} title={`Avaliar: ${reviewingItem.name}`}>
                        <ProductReviewForm 
                            productId={reviewingItem.product_id}
                            orderId={order.id}
                            onReviewSubmitted={handleReviewSuccess}
                        />
                    </Modal>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isRefundModalOpen && (
                    <Modal isOpen={true} onClose={() => setIsRefundModalOpen(false)} title={`Solicitar ${actionText} do Pedido #${order.id}`}>
                        <form onSubmit={handleRequestRefund} className="space-y-4 text-gray-800">
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Motivo da Solicitação de {actionText}</label>
                                <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} required rows="4" placeholder="Ex: Produto veio com defeito, desisti da compra, etc." className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white"></textarea>
                            </div>
                            <div className="bg-gray-100 p-3 rounded-md text-sm">
                                <p><strong>Valor a ser reembolsado:</strong> R$ {Number(order.total).toFixed(2)}</p>
                                <p className="text-xs text-gray-500 mt-1">O valor será estornado no mesmo método de pagamento da compra após a aprovação da solicitação.</p>
                            </div>
                             <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsRefundModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
                                <button type="submit" disabled={isProcessingRefund} className="px-4 py-2 bg-amber-600 text-white rounded-md flex items-center gap-2 disabled:bg-amber-300">
                                    {isProcessingRefund && <SpinnerIcon className="h-5 w-5" />}
                                    Enviar Solicitação
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>
            <div>
                <button onClick={() => onNavigate('account/orders')} className="text-sm text-amber-400 hover:underline flex items-center mb-6 w-fit transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Voltar para todos os pedidos
                </button>
                <div className="border border-gray-800 rounded-lg p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-2">
                        <div>
                            <p className="text-2xl font-bold">Detalhes do Pedido <span className="text-amber-400">#{order.id}</span></p>
                            <p className="text-sm text-gray-400">{new Date(order.date).toLocaleString('pt-BR')}</p>
                        </div>
                    </div>

                    {order.status === 'Pendente' && (
                        <div className="my-4 p-4 bg-amber-900/50 border border-amber-700 rounded-lg text-center">
                            <p className="font-semibold text-amber-300 mb-3">Este pedido está aguardando pagamento.</p>
                            <button onClick={() => handleRetryPayment(order.id)} disabled={isPaying} className="bg-amber-400 text-black font-bold px-8 py-2 rounded-md hover:bg-amber-300 transition-all disabled:opacity-50 disabled:cursor-wait flex items-center justify-center mx-auto">
                                {isPaying ? <SpinnerIcon className="h-5 w-5" /> : 'Pagar Agora'}
                            </button>
                        </div>
                    )}
                    
                    {/* --- ÁREA DE AVISO DE REEMBOLSO NEGADO (VISÍVEL E DESTACADA) --- */}
                    {isRefundDenied && (
                        <div className="my-6 p-5 bg-red-950/60 border border-red-600 rounded-lg animate-fade-in shadow-lg shadow-red-900/30">
                            <div className="flex items-start gap-3">
                                <ExclamationCircleIcon className="h-7 w-7 text-red-500 flex-shrink-0 mt-0.5 animate-pulse" />
                                <div className="flex-1">
                                    <h4 className="font-bold text-red-200 text-lg mb-2">Solicitação de Reembolso Negada</h4>
                                    <p className="text-sm text-gray-300 mb-3 leading-relaxed">
                                        Nossa equipe analisou sua solicitação e, infelizmente, ela não pôde ser aprovada no momento.
                                    </p>
                                    
                                    {/* Mostra o motivo vindo do banco */}
                                    <div className="bg-black/40 p-4 rounded-md text-sm text-white border border-red-500/30 mb-3">
                                        <strong className="text-red-400 block mb-1">Motivo da recusa:</strong>
                                        <span className="italic">"{refundDeniedReason}"</span>
                                    </div>

                                    <p className="text-xs text-gray-400">
                                        Se você acredita que houve um erro ou deseja enviar novas informações, por favor, clique em <strong>"Nova Solicitação"</strong> abaixo e forneça mais detalhes.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="my-6">
                        {isLocalDelivery ? (
                            <LocalDeliveryTimeline history={safeHistory} currentStatus={order.status} onStatusClick={handleOpenStatusModal} />
                        ) : isPickupOrder ? (
                            <PickupOrderStatusTimeline history={safeHistory} currentStatus={order.status} onStatusClick={handleOpenStatusModal} /> 
                        ) : (
                            <OrderStatusTimeline history={safeHistory} currentStatus={order.status} onStatusClick={handleOpenStatusModal} />
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="font-bold text-gray-200 mb-3">Resumo Financeiro</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-gray-300">
                                    <span>Subtotal dos produtos</span>
                                    <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                                </div>
                                <div className="flex justify-between text-gray-300">
                                    <span>Frete</span>
                                    <span>R$ {Number(order.shipping_cost).toFixed(2).replace('.', ',')}</span>
                                </div>
                                {Number(order.discount_amount) > 0 && (
                                    <div className="flex justify-between text-green-400">
                                        <span>Desconto ({order.coupon_code || 'Cupom'})</span>
                                        <span>- R$ {Number(order.discount_amount).toFixed(2).replace('.', ',')}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-white font-bold text-base border-t border-gray-700 pt-2 mt-2">
                                    <span>Total</span>
                                    <span className="text-amber-400">R$ {Number(order.total).toFixed(2).replace('.', ',')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="font-bold text-gray-200 mb-2">Forma de Pagamento</h3>
                            {renderPaymentDetails()}
                        </div>
                    </div>

                    {isPickupOrder ? (
                        <div className="my-4 p-3 bg-gray-800 rounded-md text-sm space-y-2">
                            <p><strong>Informações para Retirada:</strong></p>
                            <p><strong>Endereço:</strong> R. Leopoldo Pereira Lima, 378 – Mangabeira VIII, João Pessoa – PB</p>
                            <p><strong>Horário:</strong> Seg a Sáb, 09h-11h30 e 15h-17h30</p>
                            {pickupDetails?.personName && <p><strong>Pessoa autorizada:</strong> {pickupDetails.personName}</p>}
                            <p className="text-amber-300 text-xs mt-2">Apresente um documento com foto e o número do pedido no momento da retirada.</p>
                        </div>
                    ) : (
                        <div className="my-4 p-3 bg-gray-800 rounded-md text-sm space-y-2">
                            <p className="font-bold text-base mb-2">Endereço de Entrega:</p>
                            {shippingAddress ? (
                                <div className="space-y-1">
                                    <p><span className="font-semibold text-gray-400">Rua:</span> {shippingAddress.logradouro}</p>
                                    <p><span className="font-semibold text-gray-400">Nº:</span> {shippingAddress.numero} {shippingAddress.complemento && `- ${shippingAddress.complemento}`}</p>
                                    <p><span className="font-semibold text-gray-400">Bairro:</span> {shippingAddress.bairro}</p>
                                    <p><span className="font-semibold text-gray-400">Cidade:</span> {shippingAddress.localidade} - {shippingAddress.uf}</p>
                                    <p><span className="font-semibold text-gray-400">CEP:</span> {shippingAddress.cep}</p>
                                </div>
                            ) : <p>Endereço não informado.</p>}
                            
                            {/* Lógica de Rastreamento (Uber vs Correios) - OCULTA se cancelado/reembolsado */}
                            {order.tracking_code && !isOrderInactive && (
                                <div className="mt-4 pt-3 border-t border-gray-700">
                                    {isLocalDelivery ? (
                                        <a 
                                            href={order.tracking_code} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="block w-full text-center bg-black text-white font-bold py-3 rounded-md hover:bg-gray-900 border border-gray-600 transition-colors animate-pulse"
                                        >
                                            🚗 Acompanhar entrega em tempo real
                                        </a>
                                    ) : (
                                        <p className="font-mono text-amber-400"><strong>Cód. Rastreio:</strong> {order.tracking_code}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="border-t border-gray-800 pt-4">
                        <button onClick={() => setIsItemsExpanded(!isItemsExpanded)} className="flex justify-between items-center w-full mb-2 text-left">
                            <h4 className="font-bold text-lg text-gray-200">Itens do Pedido ({(order.items || []).length})</h4>
                            <ChevronDownIcon className={`h-6 w-6 text-gray-400 transition-transform ${isItemsExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {isItemsExpanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="space-y-3 pt-2">
                                        {(order.items || []).map(item => (
                                            <div key={`${item.product_id}-${item.variation?.id || 'base'}`} className="bg-gray-800 p-3 rounded-md">
                                                <div className="flex items-center text-sm">
                                                    <div onClick={() => onNavigate(`product/${item.product_id}`)} className="cursor-pointer flex-shrink-0">
                                                        <img src={getFirstImage(item.images)} alt={item.name} className="h-16 w-16 object-contain mr-4 bg-white rounded"/>
                                                    </div>
                                                    <div className="flex-grow">
                                                        <p className="font-semibold text-white cursor-pointer hover:text-amber-400" onClick={() => onNavigate(`product/${item.product_id}`)}>{item.quantity}x {item.name}</p>
                                                        {item.variation && <span className="text-xs block text-gray-400">{item.variation.color} / {item.variation.size}</span>}
                                                        <p className="text-gray-300 mt-1">R$ {Number(item.price).toFixed(2)}</p>
                                                    </div>
                                                </div>
                                                {order.status === 'Entregue' && (
                                                    <div className="mt-3 pt-3 border-t border-gray-700 text-right">
                                                        {item.is_reviewed ? (
                                                            <div className="flex items-center justify-end gap-2 text-sm text-green-400">
                                                                <CheckCircleIcon className="h-5 w-5" />
                                                                <span>Você já avaliou este produto.</span>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => setReviewingItem(item)}
                                                                className="bg-amber-500 text-black text-xs font-bold px-4 py-1.5 rounded-md hover:bg-amber-400 transition"
                                                            >
                                                                Avaliar Produto
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="pt-4 mt-4 border-t border-gray-800 space-y-4 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <button onClick={() => handleRepeatOrder(order.items)} className="bg-gray-700 text-white text-sm px-4 py-1.5 rounded-md hover:bg-gray-600">Repetir Pedido</button>
                            {isPickupOrder ? (
                                <button onClick={() => setIsTrackingModalOpen(true)} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-md hover:bg-blue-700">Ver Status da Retirada</button>
                            ) : (
                                order.tracking_code && !isLocalDelivery && !isOrderInactive && <button onClick={() => setIsTrackingModalOpen(true)} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-md hover:bg-blue-700">Rastrear Pedido</button>
                            )}
                             {canRequest && (
                                <button onClick={() => setIsRefundModalOpen(true)} className="bg-amber-600 text-white text-sm px-4 py-1.5 rounded-md hover:bg-amber-700 font-bold shadow-lg shadow-amber-900/30 transform hover:-translate-y-0.5 transition-transform">
                                    {isRefundDenied ? 'Nova Solicitação' : `Solicitar ${actionText}`}
                                </button>
                            )}
                            {refundInfo && (
                                <div className={`flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-md ${refundInfo.class}`}>
                                    {refundInfo.icon}
                                    <span>{refundInfo.text}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-2 text-xs text-gray-400">
                            <span>Dúvidas?</span>
                            <a href={`https://wa.me/5583987379573?text=Olá,%20gostaria%20de%20falar%20sobre%20meu%20pedido%20%23${order.id}`} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition-colors" title="Contato via WhatsApp"><WhatsappIcon className="h-4 w-4" /></a>
                            <a href="https://www.instagram.com/lovecestaseperfumesjp/" target="_blank" rel="noopener noreferrer" className="bg-pink-500 text-white p-2 rounded-full hover:bg-pink-600 transition-colors" title="Contato via Instagram"><InstagramIcon className="h-4 w-4" /></a>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
const MyOrdersListPage = ({ onNavigate }) => {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const notification = useNotification();
    const [orderToReview, setOrderToReview] = useState(null);
    const [itemToReview, setItemToReview] = useState(null);

    // Função para buscar pedidos
    const fetchOrders = useCallback(() => {
        // A API agora retorna o campo 'has_unseen_update'
        return apiService('/orders/my-orders')
            .then(data => setOrders(data.sort((a, b) => new Date(b.date) - new Date(a.date))))
            .catch(err => {
                console.error("Falha ao buscar pedidos:", err);
                if (!window.ordersErrorShown) {
                    notification.show("Falha ao buscar pedidos.", 'error');
                    window.ordersErrorShown = true;
                    setTimeout(() => { window.ordersErrorShown = false; }, 5000);
                }
            });
    }, [notification]);

    useEffect(() => {
        setIsLoading(true);
        fetchOrders().finally(() => {
            setIsLoading(false);
        });
    }, [fetchOrders]);

    const handleReviewSuccess = async () => {
        try {
            const newOrders = await apiService('/orders/my-orders');
            const sortedOrders = newOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            setOrders(sortedOrders);
            setItemToReview(null);
            setOrderToReview(null);
        } catch (err) {
            console.error("Falha ao recarregar pedidos após avaliação:", err);
            notification.show("Não foi possível atualizar a lista de pedidos.", 'error');
            setItemToReview(null);
            setOrderToReview(null);
        }
    };

    const getStatusChipClass = (status) => {
        const lowerStatus = status.toLowerCase();
        if (lowerStatus.includes('entregue')) return 'bg-green-200 text-green-800';
        if (lowerStatus.includes('cancelado') || lowerStatus.includes('recusado')) return 'bg-red-200 text-red-800';
        if (lowerStatus.includes('pendente')) return 'bg-yellow-200 text-yellow-800';
        return 'bg-blue-200 text-blue-800';
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-amber-400 mb-6">Meus Pedidos</h2>

            <AnimatePresence>
                {orderToReview && (
                    <Modal isOpen={true} onClose={() => setOrderToReview(null)} title={`Avaliar Itens do Pedido #${orderToReview.id}`}>
                        <div className="space-y-3">
                            {(orderToReview.items || []).map(item => (
                                <div key={item.id} className="flex items-center justify-between gap-4 p-2 bg-gray-100 rounded-md">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <img src={getFirstImage(item.images)} alt={item.name} className="w-12 h-12 object-contain bg-white rounded-md flex-shrink-0"/>
                                        <p className="font-semibold text-gray-800 truncate">{item.name}</p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        {!item.is_reviewed ? (
                                            <button onClick={() => setItemToReview(item)} className="bg-amber-500 text-black text-xs font-bold px-3 py-1.5 rounded-md hover:bg-amber-400 transition">Avaliar</button>
                                        ) : (
                                            <span className="text-xs text-green-600 font-semibold flex items-center gap-1"><CheckIcon className="h-4 w-4"/> Avaliado</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
            
            <AnimatePresence>
                {itemToReview && (
                    <Modal isOpen={true} onClose={() => { setItemToReview(null); setOrderToReview(null); }} title={`Deixe sua opinião sobre: ${itemToReview.name}`}>
                        <ProductReviewForm 
                            productId={itemToReview.product_id}
                            orderId={orderToReview.id}
                            onReviewSubmitted={handleReviewSuccess}
                        />
                    </Modal>
                )}
            </AnimatePresence>

            {isLoading ? (
                <div className="flex justify-center items-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-400 animate-spin" /></div>
            ) : orders.length > 0 ? (
                <div className="space-y-4">
                    {orders.map((order, idx) => {
                        const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;
                        const canReviewOrder = order.status === 'Entregue' && order.items?.some(item => !item.is_reviewed);
                        
                        // --- LÓGICA DE NOTIFICAÇÃO ---
                        // Verifica se o pedido tem atualização não vista
                        const hasNotification = !!order.has_unseen_update;

                        return (
                            <motion.div
                                key={order.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * idx }}
                                className={`bg-gray-800 p-4 rounded-lg border relative transition-all ${hasNotification ? 'border-amber-500 shadow-lg shadow-amber-900/20' : 'border-gray-700'}`}
                            >
                                {/* --- BOLINHA DE NOTIFICAÇÃO NO CARD --- */}
                                {hasNotification && (
                                    <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full border-2 border-black z-10 flex items-center gap-1 animate-bounce">
                                        <span className="h-2 w-2 bg-white rounded-full inline-block"></span>
                                        Nova Atualização
                                    </div>
                                )}

                                {firstItem && (
                                    <div className="flex items-center gap-4 border-b border-gray-700 pb-4 mb-4">
                                        <div onClick={() => onNavigate(`product/${firstItem.product_id}`)} className="cursor-pointer flex-shrink-0">
                                            <img src={getFirstImage(firstItem.images)} alt={firstItem.name} className="w-16 h-16 object-contain bg-white rounded-md"/>
                                        </div>
                                        <div className="flex-grow overflow-hidden">
                                            <p onClick={() => onNavigate(`product/${firstItem.product_id}`)} className="font-semibold text-white truncate cursor-pointer hover:text-amber-400 transition-colors">
                                                {firstItem.name}
                                            </p>
                                            {order.items.length > 1 && ( <p className="text-sm text-gray-400 mt-1">+ {order.items.length - 1} outro(s) item(ns)</p> )}
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
                                        <div><p className="text-xs text-gray-400">Pedido</p><p className="font-bold text-white">#{order.id}</p></div>
                                        <div><p className="text-xs text-gray-400">Data</p><p className="font-semibold text-gray-300">{new Date(order.date).toLocaleDateString('pt-BR')}</p></div>
                                        <div><p className="text-xs text-gray-400">Status</p><span className={`px-2 py-1 text-xs font-semibold rounded-full inline-block ${getStatusChipClass(order.status)}`}>{order.status}</span></div>
                                        <div><p className="text-xs text-gray-400">Total</p><p className="font-bold text-amber-400">R$ {Number(order.total).toFixed(2)}</p></div>
                                    </div>
                                    <div className="flex-shrink-0 w-full sm:w-auto flex flex-col items-stretch gap-2">
                                        <button 
                                            onClick={() => onNavigate(`account/orders/${order.id}`)} 
                                            className={`w-full font-bold px-4 py-2 rounded-md transition ${hasNotification ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
                                        >
                                            {hasNotification ? 'Ver Atualização' : 'Ver Detalhes'}
                                        </button>
                                        {canReviewOrder && (
                                             <button onClick={() => setOrderToReview(order)} className="w-full bg-amber-600 text-white font-bold px-4 py-2 rounded-md hover:bg-amber-700 transition">Avaliar Pedido</button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : ( <EmptyState icon={<PackageIcon className="h-12 w-12" />} title="Nenhum pedido encontrado" message="Você ainda não fez nenhuma compra." buttonText="Ver Produtos" onButtonClick={() => onNavigate('products')}/> )}
        </div>
    );
};
const MyAccountPage = ({ onNavigate, path }) => {
    const { user, logout } = useAuth();
    const { orderNotificationCount } = useShop(); // Hook para pegar a contagem
    
    // A lógica agora extrai a aba principal e o ID do detalhe
    const pathParts = (path || 'orders').split('/');
    const activeTab = pathParts[0];
    const detailId = pathParts[1];

    const handleNavigation = (tab) => {
        onNavigate(`account/${tab}`);
    };

    const tabs = [
        { 
            key: 'orders', 
            label: 'Meus Pedidos', 
            icon: <PackageIcon className="h-5 w-5"/>,
            // Adiciona a contagem apenas nesta aba
            notification: orderNotificationCount 
        },
        { key: 'addresses', label: 'Meus Endereços', icon: <MapPinIcon className="h-5 w-5"/> },
        { key: 'profile', label: 'Meus Dados', icon: <UserIcon className="h-5 w-5"/> },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'addresses':
                return <MyAddressesSection />;
            case 'profile':
                return <MyProfileSection user={user} />;
            case 'orders':
            default:
                // Se houver um ID na URL, mostra a página de detalhes
                if (detailId && !isNaN(detailId)) {
                    return <OrderDetailPage orderId={detailId} onNavigate={onNavigate} />;
                }
                // Senão, mostra a lista de pedidos
                return <MyOrdersListPage onNavigate={onNavigate} />;
        }
    };

    return (
        <div className="bg-black text-white min-h-screen py-8 sm:py-12">
            <div className="container mx-auto px-4">
                {/* Oculta o título principal na página de detalhes para evitar repetição */}
                {!detailId && <h1 className="text-3xl md:text-4xl font-bold mb-8">Minha Conta</h1>}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <aside className="lg:col-span-1">
                        <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 space-y-2">
                            {tabs.map(tab => (
                                <button 
                                    key={tab.key} 
                                    onClick={() => handleNavigation(tab.key)} 
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-left transition-colors ${activeTab === tab.key ? 'bg-amber-500 text-black font-bold' : 'hover:bg-gray-800'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        {tab.icon}
                                        <span>{tab.label}</span>
                                    </div>
                                    {/* Exibe o badge se houver notificações */}
                                    {tab.notification > 0 && (
                                        <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                                            {tab.notification}
                                        </span>
                                    )}
                                </button>
                            ))}
                            <button onClick={() => { logout(); onNavigate('home'); }} className="w-full flex items-center space-x-3 px-4 py-3 rounded-md text-left transition-colors hover:bg-gray-800">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                <span>Sair</span>
                            </button>
                        </div>
                    </aside>
                    <main className="lg:col-span-3">
                        <div className="bg-gray-900 p-4 sm:p-6 rounded-lg border border-gray-800">
                            {renderContent()}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

const EmptyState = ({ icon, title, message, buttonText, onButtonClick }) => (
    <div className="text-center py-10 sm:py-16 px-4">
        <div className="mx-auto w-fit p-4 bg-gray-800 rounded-full text-amber-400 mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 mb-6">{message}</p>
        <button onClick={onButtonClick} className="bg-amber-500 text-black px-6 py-2 rounded-md hover:bg-amber-400 font-bold">
            {buttonText}
        </button>
    </div>
);


const MyOrdersSection = ({ onNavigate }) => {
    const { addToCart } = useShop();
    const notification = useNotification();
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [orderForTracking, setOrderForTracking] = useState(null);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedStatusDetails, setSelectedStatusDetails] = useState(null);
    const [isPaying, setIsPaying] = useState(null); // Estado para o botão "Pagar Agora"

    useEffect(() => {
        apiService('/orders/my-orders')
            .then(data => setOrders(data))
            .catch(err => notification.show("Falha ao buscar pedidos.", 'error'))
            .finally(() => setIsLoading(false));
    }, [notification]);

    const handleRetryPayment = async (orderId) => {
        setIsPaying(orderId);
        try {
            const paymentResult = await apiService('/create-mercadopago-payment', 'POST', { orderId });
            if (paymentResult && paymentResult.init_point) {
                window.location.href = paymentResult.init_point;
            } else {
                throw new Error("Não foi possível obter o link de pagamento.");
            }
        } catch (error) {
            notification.show(`Erro ao tentar realizar o pagamento: ${error.message}`, 'error');
        } finally {
            setIsPaying(null);
        }
    };

    const handleRepeatOrder = (orderItems) => {
        if (!orderItems) return;
        
        const promises = (Array.isArray(orderItems) ? orderItems : []).map(item => {
            if (item.product_type === 'clothing') {
                notification.show(`Para adicionar "${item.name}" novamente, por favor, visite a página do produto para selecionar cor e tamanho.`, 'error');
                return Promise.resolve(0);
            }
            const product = { id: item.product_id, name: item.name, price: item.price, images: item.images, stock: item.stock, variations: item.variations, is_on_sale: item.is_on_sale, sale_price: item.sale_price };
            return addToCart(product, item.quantity, item.variation)
                .then(() => 1) 
                .catch(err => {
                    notification.show(`Não foi possível adicionar "${item.name}": ${err.message}`, 'error');
                    return 0; 
                });
        });

        Promise.all(promises).then(results => {
            const count = results.reduce((sum, val) => sum + val, 0);
            if (count > 0) {
                notification.show(`${count} item(ns) adicionado(s) ao carrinho!`);
                onNavigate('cart');
            }
        });
    };

    const handleOpenStatusModal = (statusDetails) => {
        setSelectedStatusDetails(statusDetails);
        setIsStatusModalOpen(true);
    };
    
    if (isLoading) return <div className="flex justify-center items-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-400"/></div>;

    return (
        <>
            <TrackingModal isOpen={!!orderForTracking} onClose={() => setOrderForTracking(null)} order={orderForTracking} />
            <StatusDescriptionModal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} details={selectedStatusDetails} />
            <h2 className="text-2xl font-bold text-amber-400 mb-6">Meus Pedidos</h2>
            {orders.length > 0 ? (
                <div className="space-y-6">
                    {orders.map(order => {
                        const isPickupOrder = order.shipping_method === 'Retirar na loja';
                        let pickupDetails = null;
                        if (isPickupOrder && typeof order.pickup_details === 'string') {
                            try {
                                pickupDetails = JSON.parse(order.pickup_details);
                            } catch (e) {
                                console.error("Erro ao parsear detalhes da retirada:", e);
                                pickupDetails = {};
                            }
                        }

                        const safeHistory = Array.isArray(order.history) ? order.history : [];
                        const orderDate = new Date(order.date);
                        const formattedDate = !isNaN(orderDate) ? orderDate.toLocaleString('pt-BR') : 'Data indisponível';

                        return (
                            <div key={order.id} className="border border-gray-800 rounded-lg p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-2">
                                    <div>
                                        <p className="text-lg">Pedido <span className="font-bold text-amber-400">#{order.id}</span></p>
                                        <p className="text-sm text-gray-400">{formattedDate}</p>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <p><strong>Total:</strong> <span className="text-amber-400 font-bold text-lg">R$ {Number(order.total).toFixed(2)}</span></p>
                                    </div>
                                </div>

                                {order.status === 'Pendente' && (
                                    <div className="my-4 p-4 bg-amber-900/50 border border-amber-700 rounded-lg text-center">
                                        <p className="font-semibold text-amber-300 mb-3">Este pedido está aguardando pagamento.</p>
                                        <button
                                            onClick={() => handleRetryPayment(order.id)}
                                            disabled={isPaying === order.id}
                                            className="bg-amber-400 text-black font-bold px-8 py-2 rounded-md hover:bg-amber-300 transition-all disabled:opacity-50 disabled:cursor-wait flex items-center justify-center mx-auto"
                                        >
                                            {isPaying === order.id ? <SpinnerIcon className="h-5 w-5" /> : 'Pagar Agora'}
                                        </button>
                                    </div>
                                )}

                                <div className="my-6">
                                    {isPickupOrder ? (
                                        <PickupOrderStatusTimeline history={safeHistory} currentStatus={order.status} onStatusClick={handleOpenStatusModal} />
                                    ) : (
                                        <OrderStatusTimeline history={safeHistory} currentStatus={order.status} onStatusClick={handleOpenStatusModal} />
                                    )}
                                </div>
                                
                                {isPickupOrder ? (
                                    <div className="my-4 p-3 bg-gray-800 rounded-md text-sm space-y-2">
                                        <p><strong>Informações para Retirada:</strong></p>
                                        <p><strong>Endereço:</strong> R. Leopoldo Pereira Lima, 378 – Mangabeira VIII, João Pessoa – PB</p>
                                        <p><strong>Horário:</strong> Seg a Sáb, 09h-11h30 e 15h-17h30</p>
                                        {pickupDetails?.personName && <p><strong>Pessoa autorizada:</strong> {pickupDetails.personName}</p>}
                                        <p className="text-amber-300 text-xs mt-2">Apresente um documento com foto e o número do pedido no momento da retirada.</p>
                                    </div>
                                ) : (
                                     order.tracking_code && <p className="my-4 p-3 bg-gray-800 rounded-md text-sm"><strong>Cód. Rastreio:</strong> {order.tracking_code}</p>
                                )}

                                <div className="space-y-2 mb-4 border-t border-gray-800 pt-4">
                                    {(Array.isArray(order.items) ? order.items : []).map(item => (
                                        <div key={item.id} className="flex items-center text-sm">
                                            <img src={getFirstImage(item.images)} alt={item.name} className="h-10 w-10 object-contain mr-3 bg-white rounded"/>
                                            <div className="flex-grow">
                                                <span>{item.quantity}x {item.name}</span>
                                                {item.variation && <span className="text-xs block text-gray-400">{item.variation.color} / {item.variation.size}</span>}
                                            </div>
                                            <span className="ml-auto">R$ {Number(item.price).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-4 border-t border-gray-800 space-y-4 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button onClick={() => handleRepeatOrder(order.items)} className="bg-gray-700 text-white text-sm px-4 py-1.5 rounded-md hover:bg-gray-600">Repetir Pedido</button>
                                        {isPickupOrder ? (
                                            <button onClick={() => setOrderForTracking(order)} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-md hover:bg-blue-700">Ver Status da Retirada</button>
                                        ) : (
                                            order.tracking_code && <button onClick={() => setOrderForTracking(order)} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-md hover:bg-blue-700">Rastrear Pedido</button>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-end gap-2 text-xs text-gray-400">
                                        <span>Dúvidas?</span>
                                        <a href={`https://wa.me/5583987379573?text=Olá,%20gostaria%20de%20falar%20sobre%20meu%20pedido%20%23${order.id}`} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition-colors" title="Contato via WhatsApp">
                                            <WhatsappIcon className="h-4 w-4" />
                                        </a>
                                        <a href="https://www.instagram.com/lovecestaseperfumesjp/" target="_blank" rel="noopener noreferrer" className="bg-pink-500 text-white p-2 rounded-full hover:bg-pink-600 transition-colors" title="Contato via Instagram">
                                            <InstagramIcon className="h-4 w-4" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                 <EmptyState 
                    icon={<PackageIcon className="h-12 w-12"/>}
                    title="Nenhum pedido encontrado"
                    message="Você ainda não fez nenhuma compra. Explore nossos produtos!"
                    buttonText="Ver Produtos"
                    onButtonClick={() => onNavigate('products')}
                />
            )}
        </>
    );
};

const MyAddressesSection = () => {
    const { addresses, fetchAddresses, determineShippingLocation } = useShop();
    const notification = useNotification();
    const confirmation = useConfirmation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);

    const handleOpenModal = (address = null) => {
        if (!address && addresses.length >= 5) {
            notification.show("Você já possui 5 endereços cadastrados. Exclua um para adicionar outro.", "error");
            return;
        }
        setEditingAddress(address);
        setIsModalOpen(true);
    };

    const handleSaveAddress = async (formData) => {
        try {
            if (editingAddress) {
                await apiService(`/addresses/${editingAddress.id}`, 'PUT', formData);
                notification.show('Endereço atualizado!');
            } else {
                await apiService('/addresses', 'POST', formData);
                notification.show('Endereço adicionado!');
            }
            await fetchAddresses();
            determineShippingLocation(); 
            setIsModalOpen(false);
        } catch (error) {
            notification.show(`Erro: ${error.message}`, 'error');
        }
    };
    
    const handleDeleteAddress = (id) => {
        confirmation.show("Tem certeza que deseja excluir este endereço?", async () => {
            try {
                await apiService(`/addresses/${id}`, 'DELETE');
                notification.show('Endereço excluído.');
                await fetchAddresses();
                determineShippingLocation(); 
            } catch (error) {
                notification.show(`Erro: ${error.message}`, 'error');
            }
        });
    };
    
    const handleSetDefault = async (id) => {
        try {
            await apiService(`/addresses/${id}/default`, 'PUT');
            notification.show('Endereço padrão atualizado.');
            await fetchAddresses();
            determineShippingLocation();
        } catch (error) {
            notification.show(`Erro: ${error.message}`, 'error');
        }
    };
    
    return (
        <>
            <AnimatePresence>
                {isModalOpen && (
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAddress ? 'Editar Endereço' : 'Adicionar Endereço'}>
                        <AddressForm initialData={editingAddress} onSave={handleSaveAddress} onCancel={() => setIsModalOpen(false)} />
                    </Modal>
                )}
            </AnimatePresence>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-amber-400">Meus Endereços</h2>
                <button 
                    onClick={() => handleOpenModal()} 
                    disabled={addresses.length >= 5}
                    className="bg-amber-500 text-black px-4 py-2 rounded-md hover:bg-amber-400 font-bold text-sm disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <PlusIcon className="h-5 w-5" />
                    Adicionar Novo
                </button>
            </div>
             {addresses.length >= 5 && (
                <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 text-sm p-3 rounded-md mb-6 flex items-center gap-2">
                    <ExclamationCircleIcon className="h-5 w-5" />
                    Você atingiu o limite de 5 endereços. Para adicionar um novo, por favor, exclua um existente.
                </div>
            )}
            {addresses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {addresses.map(addr => (
                        <div key={addr.id} className="bg-gray-800 p-5 rounded-lg border border-gray-700 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg">{addr.alias}</h3>
                                {addr.is_default ? (
                                    <span className="text-xs bg-amber-400 text-black px-3 py-1 rounded-full font-semibold flex items-center gap-1"><CheckIcon className="h-3 w-3"/> Padrão</span>
                                ) : (
                                    <button onClick={() => handleSetDefault(addr.id)} className="text-xs text-amber-400 hover:underline">Tornar Padrão</button>
                                )}
                            </div>
                            <div className="text-sm text-gray-300 flex-grow">
                                <p>{addr.logradouro}, {addr.numero} {addr.complemento && `- ${addr.complemento}`}</p>
                                <p>{addr.bairro}, {addr.localidade} - {addr.uf}</p>
                                <p>{addr.cep}</p>
                            </div>
                            <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-700">
                                <button onClick={() => handleOpenModal(addr)} className="p-2 text-gray-400 hover:text-white"><EditIcon className="h-5 w-5"/></button>
                                <button onClick={() => handleDeleteAddress(addr.id)} className="p-2 text-gray-400 hover:text-red-500"><TrashIcon className="h-5 w-5"/></button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyState 
                    icon={<MapPinIcon className="h-12 w-12"/>}
                    title="Nenhum endereço cadastrado"
                    message="Adicione seu primeiro endereço para agilizar suas compras."
                    buttonText="Adicionar Endereço"
                    onButtonClick={() => handleOpenModal()}
                />
            )}
        </>
    );
};

const MyProfileSection = () => {
    const { user, setUser } = useAuth();
    const notification = useNotification();

    // Estados para o Modal de Senha
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);

    // Estados para o Modal de 2FA
    const [is2faModalOpen, setIs2faModalOpen] = useState(false);
    const [is2faDisableModalOpen, setIs2faDisableModalOpen] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [twoFactorSecret, setTwoFactorSecret] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [disablePassword, setDisablePassword] = useState('');
    const [disableVerificationCode, setDisableVerificationCode] = useState(''); // NOVO ESTADO
    const [is2faLoading, setIs2faLoading] = useState(false);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            notification.show("A nova senha deve ter pelo menos 6 caracteres.", "error");
            return;
        }
        setIsPasswordLoading(true);
        try {
            await apiService('/users/me/password', 'PUT', { password: newPassword });
            notification.show('Senha alterada com sucesso!');
            setNewPassword('');
            setIsPasswordModalOpen(false);
        } catch (error) {
            notification.show(`Erro: ${error.message}`, 'error');
        } finally {
            setIsPasswordLoading(false);
        }
    };

    const handleGenerate2FA = async () => {
        setIs2faLoading(true);
        try {
            const data = await apiService('/2fa/generate', 'POST');
            setQrCodeUrl(data.qrCodeUrl);
            setTwoFactorSecret(data.secret);
            setIs2faModalOpen(true);
        } catch (error) {
            notification.show(`Erro ao gerar código 2FA: ${error.message}`, 'error');
        } finally {
            setIs2faLoading(false);
        }
    };

    const handleVerifyAndEnable2FA = async (e) => {
        e.preventDefault();
        setIs2faLoading(true);
        try {
            await apiService('/2fa/verify-enable', 'POST', { token: verificationCode });
            notification.show('Autenticação de Dois Fatores ativada com sucesso!');
            const updatedUser = { ...user, is_two_factor_enabled: 1 };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setIs2faModalOpen(false);
        } catch (error) {
            notification.show(`Erro na verificação: ${error.message}`, 'error');
        } finally {
            setIs2faLoading(false);
        }
    };

    const handleDisable2FA = async (e) => {
        e.preventDefault();
        setIs2faLoading(true);
        try {
            await apiService('/2fa/disable', 'POST', { 
                password: disablePassword,
                token: disableVerificationCode // ENVIA O TOKEN
            });
            notification.show('Autenticação de Dois Fatores desativada.');
            const updatedUser = { ...user, is_two_factor_enabled: 0 };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setIs2faDisableModalOpen(false);
            setDisablePassword('');
            setDisableVerificationCode(''); // LIMPA O ESTADO
        } catch (error) {
            notification.show(`Erro ao desativar: ${error.message}`, 'error');
        } finally {
            setIs2faLoading(false);
        }
    };

    return (
        <>
            <AnimatePresence>
                {isPasswordModalOpen && (
                    <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title="Alterar Senha">
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md" />
                            </div>
                            <button type="submit" disabled={isPasswordLoading} className="w-full bg-amber-500 text-black font-bold py-2 rounded-md hover:bg-amber-400 flex justify-center items-center disabled:opacity-50">
                                {isPasswordLoading ? <SpinnerIcon/> : "Confirmar Alteração"}
                            </button>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {is2faModalOpen && (
                    <Modal isOpen={true} onClose={() => setIs2faModalOpen(false)} title="Ativar Autenticação de Dois Fatores">
                        <div className="text-center space-y-4">
                            <p className="text-gray-600">1. Escaneie este QR Code com seu aplicativo autenticador (Google Authenticator, Authy, etc).</p>
                            <img src={qrCodeUrl} alt="QR Code para 2FA" className="mx-auto border-4 border-white shadow-lg"/>
                            <p className="text-gray-600 text-sm">Se não puder escanear, insira esta chave manualmente:</p>
                            <p className="font-mono bg-gray-200 p-2 rounded-md text-gray-800 break-all">{twoFactorSecret}</p>
                            <form onSubmit={handleVerifyAndEnable2FA} className="space-y-3 pt-4 border-t">
                                <label className="block text-sm font-medium text-gray-700">2. Insira o código de 6 dígitos gerado:</label>
                                <input 
                                    type="text" 
                                    value={verificationCode}
                                    onChange={e => setVerificationCode(e.target.value)}
                                    maxLength="6"
                                    placeholder="123456"
                                    className="w-full max-w-xs mx-auto text-center tracking-[0.5em] p-2 bg-gray-100 border border-gray-300 rounded-md text-xl font-mono"
                                />
                                <button type="submit" disabled={is2faLoading} className="w-full max-w-xs mx-auto bg-green-600 text-white font-bold py-2 rounded-md hover:bg-green-700 flex justify-center items-center disabled:opacity-50">
                                    {is2faLoading ? <SpinnerIcon/> : "Ativar e Verificar"}
                                </button>
                            </form>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {is2faDisableModalOpen && (
                     <Modal isOpen={true} onClose={() => setIs2faDisableModalOpen(false)} title="Desativar Autenticação de Dois Fatores">
                        <form onSubmit={handleDisable2FA} className="space-y-4">
                            <p className="text-red-700 bg-red-100 p-3 rounded-md text-sm">Atenção: Para desativar o 2FA, por segurança, você deve fornecer sua **senha** e um **código de autenticação** válido.</p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sua Senha</label>
                                <input type="password" value={disablePassword} onChange={e => setDisablePassword(e.target.value)} required className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Código de Autenticação (2FA)</label>
                                <input 
                                    type="text" 
                                    value={disableVerificationCode} 
                                    onChange={e => setDisableVerificationCode(e.target.value)}
                                    maxLength="6"
                                    placeholder="123456"
                                    required 
                                    className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md text-center font-mono tracking-widest"
                                />
                            </div>
                            <button type="submit" disabled={is2faLoading} className="w-full bg-red-600 text-white font-bold py-2 rounded-md hover:bg-red-700 flex justify-center items-center disabled:opacity-50">
                                {is2faLoading ? <SpinnerIcon/> : "Confirmar e Desativar"}
                            </button>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>

            <h2 className="text-2xl font-bold text-amber-400 mb-6">Meus Dados</h2>
            <div className="bg-gray-800 p-6 rounded-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center"><strong className="w-24 text-gray-400 flex-shrink-0">Nome:</strong><span className="text-white">{user?.name}</span></div>
                <div className="flex flex-col sm:flex-row sm:items-center"><strong className="w-24 text-gray-400 flex-shrink-0">Email:</strong><span className="text-white">{user?.email}</span></div>
            </div>
            <button onClick={() => setIsPasswordModalOpen(true)} className="mt-6 bg-gray-700 text-white font-bold py-2 px-6 rounded-md hover:bg-gray-600">Alterar Senha</button>

            {user?.role === 'admin' && (
                <div className="mt-8 pt-6 border-t border-gray-800">
                    <h3 className="text-xl font-bold text-amber-400 mb-4">Segurança (Admin)</h3>
                    <div className="bg-gray-800 p-6 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h4 className="font-bold flex items-center gap-2"><ShieldCheckIcon className="h-5 w-5 text-amber-400"/> Autenticação de Dois Fatores (2FA)</h4>
                            <p className="text-sm text-gray-400 mt-1">Aumente a segurança da sua conta exigindo um código de verificação ao fazer login.</p>
                        </div>
                        {user.is_two_factor_enabled ? (
                            <div className="text-center flex-shrink-0">
                                <p className="text-sm font-semibold text-green-400 bg-green-900/50 px-3 py-1 rounded-full mb-2">Ativo</p>
                                <button onClick={() => setIs2faDisableModalOpen(true)} className="text-xs text-red-400 hover:underline">Desativar</button>
                            </div>
                        ) : (
                            <button onClick={handleGenerate2FA} disabled={is2faLoading} className="bg-amber-500 text-black font-bold py-2 px-4 rounded-md hover:bg-amber-400 flex items-center justify-center disabled:opacity-50 flex-shrink-0">
                                {is2faLoading ? <SpinnerIcon/> : "Ativar 2FA"}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
const AjudaPage = ({ onNavigate }) => {
    const faqData = [
        {
            q: "Como posso rastrear meu pedido?",
            a: <>Para rastrear seu pedido, acesse a seção <a href="#account/orders" onClick={(e) => { e.preventDefault(); onNavigate('account/orders'); }} className="text-amber-400 underline hover:text-amber-300">"Meus Pedidos"</a> em sua conta, localize o pedido desejado e clique em "Ver Detalhes". Se houver um código de rastreio, ele estará disponível lá, junto com um botão para rastreá-lo.</>
        },
        {
            q: "Quais são as formas de pagamento aceitas?",
            a: <>Aceitamos pagamentos via Pix, Boleto Bancário e Cartão de Crédito. Todos os pagamentos são processados de forma segura através do Mercado Pago. Você pode parcelar suas compras no cartão de crédito, e as opções de parcelamento serão exibidas na página de finalização da compra.</>
        },
        {
            q: "Qual é o prazo de entrega?",
            a: <>O prazo de entrega varia de acordo com o seu CEP e a modalidade de envio escolhida (PAC ou Sedex). Você pode calcular o prazo estimado na página do produto ou no carrinho de compras antes de finalizar o pedido. Para João Pessoa, PB, também oferecemos a opção de retirada na loja.</>
        },
        {
            q: "Como funciona a política de troca e devolução?",
            a: <>Você pode solicitar a troca ou devolução de um produto em até 7 dias corridos após o recebimento. O produto não deve apresentar sinais de uso e deve estar em sua embalagem original. Para iniciar o processo, acesse a página de detalhes do seu pedido em <a href="#account/orders" onClick={(e) => { e.preventDefault(); onNavigate('account/orders'); }} className="text-amber-400 underline hover:text-amber-300">"Meus Pedidos"</a> e utilize a opção de solicitar cancelamento/reembolso, informando o motivo.</>
        },
    ];

    const AccordionItem = ({ question, answer }) => {
        const [isOpen, setIsOpen] = useState(false);
        return (
            <div className="border-b border-gray-800">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex justify-between items-center text-left py-4 px-2"
                >
                    <span className="font-semibold text-lg text-white">{question}</span>
                    <ChevronDownIcon className={`h-6 w-6 text-amber-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <div className="pb-4 px-2 text-gray-400">{answer}</div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <div className="bg-black text-white min-h-screen py-12">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-amber-400">Central de Ajuda</h1>
                    <p className="text-lg text-gray-400">Como podemos ajudar você hoje?</p>
                </div>

                <div className="mb-16">
                    <h2 className="text-2xl font-bold text-center mb-8">Ações Rápidas</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div onClick={() => onNavigate('account/orders')} className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-center cursor-pointer hover:border-amber-400 hover:bg-gray-800 transition-all">
                            <TruckIcon className="h-10 w-10 mx-auto text-amber-400 mb-3" />
                            <h3 className="font-semibold text-xl">Rastrear Pedido</h3>
                            <p className="text-sm text-gray-500 mt-1">Acompanhe o status da sua entrega.</p>
                        </div>
                        <div onClick={() => onNavigate('account')} className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-center cursor-pointer hover:border-amber-400 hover:bg-gray-800 transition-all">
                            <UserIcon className="h-10 w-10 mx-auto text-amber-400 mb-3" />
                            <h3 className="font-semibold text-xl">Minha Conta</h3>
                            <p className="text-sm text-gray-500 mt-1">Veja seus pedidos e dados cadastrais.</p>
                        </div>
                        <div onClick={() => onNavigate('checkout')} className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-center cursor-pointer hover:border-amber-400 hover:bg-gray-800 transition-all">
                            <CurrencyDollarIcon className="h-10 w-10 mx-auto text-amber-400 mb-3" />
                            <h3 className="font-semibold text-xl">Pagamentos</h3>
                            <p className="text-sm text-gray-500 mt-1">Conheça nossas formas de pagamento.</p>
                        </div>
                    </div>
                </div>

                <div className="mb-16">
                    <h2 className="text-2xl font-bold text-center mb-8">Perguntas Frequentes</h2>
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                        {faqData.map((faq, index) => (
                            <AccordionItem key={index} question={faq.q} answer={faq.a} />
                        ))}
                    </div>
                </div>

                <div className="text-center bg-gray-900 p-8 rounded-lg border border-gray-800">
                    <h2 className="text-2xl font-bold mb-2">Ainda precisa de ajuda?</h2>
                    <p className="text-gray-400 mb-6">Nossa equipe está pronta para te atender em nossos canais oficiais.</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                         <a href="https://wa.me/5583987379573" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 bg-green-500 text-white font-bold p-4 rounded-lg hover:bg-green-600 transition-colors w-full sm:w-auto">
                            <WhatsappIcon className="h-6 w-6" />
                            <span>Contatar via WhatsApp</span>
                        </a>
                        <a href="https://www.instagram.com/lovecestaseperfumesjp/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 bg-pink-500 text-white font-bold p-4 rounded-lg hover:bg-pink-600 transition-colors w-full sm:w-auto">
                            <InstagramIcon className="h-6 w-6" />
                            <span>Mensagem no Instagram</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AboutPage = () => {
    return (
        <div className="bg-black text-white min-h-screen py-16">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-amber-400">Sobre Nós</h1>
                    <p className="text-lg text-gray-400">Elegância que Veste e Perfuma</p>
                </div>

                <div className="bg-gray-900 p-8 rounded-lg border border-gray-800 space-y-8 text-lg text-gray-300 leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">Nossa História</h2>
                        <p>A Love Cestas e Perfumes nasceu de uma paixão por aromas marcantes e pela moda que expressa identidade. Fundada em João Pessoa, Paraíba, nossa missão sempre foi oferecer mais do que produtos; oferecemos uma experiência de autoestima e bem-estar. Cada peça de roupa é selecionada com um olhar atento às tendências e à qualidade, e cada perfume é escolhido por sua capacidade de criar memórias inesquecíveis.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">Nossa Missão</h2>
                        <p>Nossa missão é simples: realçar a beleza e a confiança de cada cliente. Acreditamos que a combinação de uma fragrância envolvente e um look que reflete sua personalidade tem o poder de transformar o dia a dia. Trabalhamos para ser sua primeira escolha quando o assunto é se sentir bem, seja para uma ocasião especial ou para o conforto do cotidiano.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">Nossos Valores</h2>
                        <ul className="list-disc list-inside space-y-2">
                            <li><span className="font-semibold text-amber-400">Qualidade:</span> Comprometimento com produtos de alta durabilidade e procedência.</li>
                            <li><span className="font-semibold text-amber-400">Atendimento:</span> Uma experiência de compra próxima e atenciosa, do primeiro clique à entrega.</li>
                            <li><span className="font-semibold text-amber-400">Confiança:</span> Transparência em todos os processos para construir um relacionamento sólido com você.</li>
                            <li><span className="font-semibold text-amber-400">Paixão:</span> Amor em cada detalhe, desde a seleção dos produtos até a embalagem que chega em sua casa.</li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
};

const PrivacyPolicyPage = () => {
    return (
        <div className="bg-black text-white min-h-screen py-16">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-amber-400">Política de Privacidade</h1>
                    <p className="text-gray-400">Última atualização: 16 de Outubro de 2025</p>
                </div>
                <div className="bg-gray-900 p-8 rounded-lg border border-gray-800 space-y-6 text-gray-300 leading-relaxed">
                    <p>Sua privacidade é importante para nós. É política da LovecestasePerfumes respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar em nosso site.</p>
                    
                    <h3 className="text-xl font-bold text-white pt-4">1. Coleta de Dados</h3>
                    <p>Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento. Também informamos por que estamos coletando e como será usado.</p>

                    <h3 className="text-xl font-bold text-white pt-4">2. Uso de Dados</h3>
                    <p>Apenas retemos as informações coletadas pelo tempo necessário para fornecer o serviço solicitado. Quando armazenamos dados, protegemos dentro de meios comercialmente aceitáveis para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.</p>

                    <h3 className="text-xl font-bold text-white pt-4">3. Cookies</h3>
                    <p>Nosso site utiliza cookies para melhorar a sua experiência de navegação. Cookies são pequenos arquivos que são armazenados no seu computador para coletar informações como suas preferências e itens no carrinho. Você pode desativar os cookies nas configurações do seu navegador, mas isso pode afetar a funcionalidade do site.</p>

                    <h3 className="text-xl font-bold text-white pt-4">4. Seus Direitos (LGPD)</h3>
                    <p>Você tem o direito de acessar, corrigir ou excluir suas informações pessoais a qualquer momento. Você pode gerenciar seus dados na seção "Minha Conta" ou entrando em contato conosco. Estamos em conformidade com a Lei Geral de Proteção de Dados (LGPD).</p>

                    <h3 className="text-xl font-bold text-white pt-4">5. Links para Sites de Terceiros</h3>
                    <p>O nosso site pode ter links para sites externos que não são operados por nós. Esteja ciente de que não temos controle sobre o conteúdo e práticas desses sites e não podemos aceitar responsabilidade por suas respectivas políticas de privacidade.</p>
                    
                    <h3 className="text-xl font-bold text-white pt-4">6. Contato</h3>
                    <p>Se você tiver alguma dúvida sobre como lidamos com dados do usuário e informações pessoais, entre em contato conosco através dos nossos canais de atendimento na Central de Ajuda.</p>
                </div>
            </div>
        </div>
    );
};

const TermsOfServicePage = () => {
    return (
        <div className="bg-black text-white min-h-screen py-16">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-amber-400">Termos de Serviço</h1>
                    <p className="text-gray-400">Última atualização: 16 de Outubro de 2025</p>
                </div>
                <div className="bg-gray-900 p-8 rounded-lg border border-gray-800 space-y-6 text-gray-300 leading-relaxed">
                    <h3 className="text-xl font-bold text-white">1. Aceitação dos Termos</h3>
                    <p>Ao acessar e usar o site da LovecestasePerfumes, você concorda em cumprir estes Termos de Serviço e todas as leis e regulamentos aplicáveis. Se você não concorda com algum destes termos, está proibido de usar ou acessar este site.</p>

                    <h3 className="text-xl font-bold text-white pt-4">2. Contas de Usuário</h3>
                    <p>Para acessar certas funcionalidades, você pode ser solicitado a criar uma conta. Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorrem em sua conta. Você concorda em nos notificar imediatamente sobre qualquer uso não autorizado de sua conta.</p>

                    <h3 className="text-xl font-bold text-white pt-4">3. Produtos e Preços</h3>
                    <p>Fazemos o nosso melhor para exibir com precisão as cores e imagens dos nossos produtos. Não podemos garantir que a exibição de qualquer cor no monitor do seu computador seja precisa. Os preços dos nossos produtos estão sujeitos a alterações sem aviso prévio. Reservamo-nos o direito de, a qualquer momento, modificar ou descontinuar um produto sem aviso prévio.</p>
                    
                    <h3 className="text-xl font-bold text-white pt-4">4. Pedidos e Pagamentos</h3>
                    <p>Reservamo-nos o direito de recusar qualquer pedido que você fizer conosco. Podemos, a nosso critério, limitar ou cancelar as quantidades compradas por pessoa, por domicílio ou por pedido. No caso de fazermos uma alteração ou cancelarmos um pedido, podemos tentar notificá-lo entrando em contato com o e-mail e/ou endereço de faturamento/número de telefone fornecido no momento em que o pedido foi feito.</p>

                    <h3 className="text-xl font-bold text-white pt-4">5. Limitação de Responsabilidade</h3>
                    <p>Em nenhuma circunstância a LovecestasePerfumes será responsável por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucro, ou devido a interrupção dos negócios) decorrentes do uso ou da incapacidade de usar os materiais no site da LovecestasePerfumes.</p>
                </div>
            </div>
        </div>
    );
};

const AdminNewsletter = () => {
    const [subscribers, setSubscribers] = useState([]);
    const [products, setProducts] = useState([]); // Lista de produtos para o select
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('compose');
    
    // Estados do Formulário
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [ctaLink, setCtaLink] = useState('');
    const [ctaText, setCtaText] = useState('');
    
    // Novos Estados para Produto
    const [selectedProductId, setSelectedProductId] = useState('');
    const [discountText, setDiscountText] = useState('');

    const [isSending, setIsSending] = useState(false);
    
    const notification = useNotification();
    const confirmation = useConfirmation();

    const fetchData = useCallback(() => {
        setIsLoading(true);
        Promise.all([
            apiService('/newsletter/subscribers'),
            apiService('/products') // Busca produtos para o dropdown
        ])
        .then(([subsData, productsData]) => {
            setSubscribers(subsData || []);
            setProducts(productsData || []);
        })
        .catch(err => notification.show('Erro ao carregar dados.', 'error'))
        .finally(() => setIsLoading(false));
    }, [notification]);

    useEffect(() => { fetchData() }, [fetchData]);

    const handleSend = (e) => {
        e.preventDefault();
        
        if (subscribers.length === 0) {
            notification.show("Sua lista de e-mails está vazia.", "error");
            return;
        }

        confirmation.show(
            `Confirmar envio para ${subscribers.length} pessoas? Esta ação não pode ser desfeita.`,
            async () => {
                setIsSending(true);
                try {
                    const response = await apiService('/newsletter/broadcast', 'POST', {
                        subject,
                        message,
                        ctaLink,
                        ctaText,
                        productId: selectedProductId || null, // Envia o ID se selecionado
                        discountText
                    });
                    notification.show(response.message, 'success');
                    
                    // Limpar formulário
                    setSubject('');
                    setMessage('');
                    setCtaLink('');
                    setCtaText('');
                    setSelectedProductId('');
                    setDiscountText('');
                } catch (error) {
                    notification.show(error.message, 'error');
                } finally {
                    setIsSending(false);
                }
            },
            { 
                confirmText: "ENVIAR CAMPANHA", 
                confirmColor: "bg-green-600 hover:bg-green-700",
                requiresAuth: true // Exige Senha/2FA para enviar
            }
        );
    };

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Marketing & Clube VIP</h1>
                <p className="text-gray-500">Gerencie sua lista e envie ofertas exclusivas.</p>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total de Inscritos</h3>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{subscribers.length}</p>
                </div>
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 rounded-lg shadow-md text-white">
                    <h3 className="text-white/80 text-xs font-bold uppercase tracking-wider">Potencial de Venda</h3>
                    <p className="text-3xl font-bold mt-2 flex items-center gap-2">
                        <SparklesIcon className="h-6 w-6"/> Alto
                    </p>
                    <p className="text-xs text-white/80 mt-1">Sua lista é seu maior ativo.</p>
                </div>
            </div>

            {/* Abas */}
            <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-lg shadow-sm">
                <button 
                    onClick={() => setActiveTab('compose')} 
                    className={`flex-1 px-6 py-4 font-bold text-sm transition-all border-b-2 ${activeTab === 'compose' ? 'border-amber-500 text-amber-600 bg-amber-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                    Nova Campanha
                </button>
                <button 
                    onClick={() => setActiveTab('list')} 
                    className={`flex-1 px-6 py-4 font-bold text-sm transition-all border-b-2 ${activeTab === 'list' ? 'border-amber-500 text-amber-600 bg-amber-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                    Ver Lista ({subscribers.length})
                </button>
            </div>

            {activeTab === 'compose' && (
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm animate-fade-in">
                    <form onSubmit={handleSend} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Assunto do E-mail</label>
                            <input 
                                type="text" 
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Ex: 🔥 Oferta Relâmpago: 20% OFF só hoje!" 
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Mensagem Principal</label>
                            <textarea 
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Escreva sua mensagem aqui... Dica: Seja breve e direto." 
                                rows="6"
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                required
                            />
                        </div>

                        {/* --- NOVO BLOCO: DESTAQUE DE PRODUTO --- */}
                        <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                            <h4 className="font-bold text-blue-800 text-sm mb-3 flex items-center gap-2">
                                <TagIcon className="h-4 w-4"/> Destaque de Produto (Opcional)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-blue-700 mb-1">Selecionar Produto</label>
                                    <select 
                                        value={selectedProductId}
                                        onChange={(e) => setSelectedProductId(e.target.value)}
                                        className="w-full p-2 border border-blue-300 rounded-md text-sm bg-white"
                                    >
                                        <option value="">-- Nenhum Produto Selecionado --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} - R$ {Number(p.sale_price || p.price).toFixed(2)}</option>
                                        ))}
                                    </select>
                                </div>
                                {selectedProductId && (
                                    <div>
                                        <label className="block text-xs font-bold text-blue-700 mb-1">Texto do Desconto/Chamada</label>
                                        <input 
                                            type="text" 
                                            value={discountText}
                                            onChange={(e) => setDiscountText(e.target.value)}
                                            placeholder="Ex: 20% OFF SOMENTE HOJE" 
                                            className="w-full p-2 border border-blue-300 rounded-md text-sm"
                                        />
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-blue-600 mt-2">
                                *Se selecionado, um card com a foto, nome e preço do produto será inserido automaticamente no meio do e-mail.
                            </p>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                            <h4 className="font-bold text-gray-700 text-sm mb-3">Botão de Ação Extra (Opcional)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Texto do Botão</label>
                                    <input 
                                        type="text" 
                                        value={ctaText}
                                        onChange={(e) => setCtaText(e.target.value)}
                                        placeholder="Ex: Ver Toda a Loja" 
                                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Link de Destino</label>
                                    <input 
                                        type="text" 
                                        value={ctaLink}
                                        onChange={(e) => setCtaLink(e.target.value)}
                                        placeholder="Ex: https://loja.com.br" 
                                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end pt-4 border-t">
                            <button 
                                type="submit" 
                                disabled={isSending}
                                className="bg-green-600 text-white px-8 py-3 rounded-md font-bold hover:bg-green-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                            >
                                {isSending ? <SpinnerIcon className="h-5 w-5"/> : <PaperAirplaneIcon className="h-5 w-5"/>}
                                {isSending ? 'Enviando...' : 'Enviar para Todos'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {activeTab === 'list' && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden animate-fade-in">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="p-4 font-bold text-gray-600">Email</th>
                                <th className="p-4 font-bold text-gray-600">Data de Inscrição</th>
                                <th className="p-4 font-bold text-gray-600">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {subscribers.map((sub) => (
                                <tr key={sub.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-medium text-gray-800">{sub.email}</td>
                                    <td className="p-4 text-gray-500">{new Date(sub.created_at).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">Ativo</span>
                                    </td>
                                </tr>
                            ))}
                            {subscribers.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="p-8 text-center text-gray-400">Nenhum inscrito ainda.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// --- PAINEL DO ADMINISTRADOR ---
const AdminLayout = memo(({ activePage, onNavigate, children }) => {
    const { user, logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [newOrdersCount, setNewOrdersCount] = useState(0);
    const mainContentRef = useRef(null);

    // Busca contagem de novos pedidos para o badge de notificação
    useEffect(() => {
        apiService('/orders')
            .then(data => {
                if (!Array.isArray(data)) {
                    setNewOrdersCount(0);
                    return;
                }
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const recentOrders = data.filter(o => {
                    if (!o || !o.date) return false;
                    const orderDate = new Date(o.date);
                    return !isNaN(orderDate) && orderDate > twentyFourHoursAgo;
                });
                setNewOrdersCount(recentOrders.length);
            })
            .catch(err => {
                console.error("Erro silencioso ao buscar contagem de pedidos:", err);
                setNewOrdersCount(0);
            });
    }, [activePage]);

    const handleLogout = () => {
        logout();
        onNavigate('home');
    }

    const menuGroups = [
        {
            title: "Principal",
            items: [
                { key: 'dashboard', label: 'Visão Geral', icon: <ChartIcon className="h-5 w-5"/> },
                { key: 'orders', label: 'Pedidos', icon: <TruckIcon className="h-5 w-5"/>, badge: newOrdersCount },
                { key: 'refunds', label: 'Reembolsos', icon: <CurrencyDollarArrowIcon className="h-5 w-5"/> },
            ]
        },
        {
            title: "Catálogo",
            items: [
                { key: 'products', label: 'Produtos', icon: <BoxIcon className="h-5 w-5"/> },
                { key: 'collections', label: 'Coleções', icon: <SparklesIcon className="h-5 w-5"/> },
                { key: 'coupons', label: 'Cupons', icon: <TagIcon className="h-5 w-5"/> },
            ]
        },
        {
            title: "Marketing & Clientes",
            items: [
                { key: 'banners', label: 'Banners', icon: <PhotoIcon className="h-5 w-5"/> },
                { key: 'users', label: 'Clientes', icon: <UsersIcon className="h-5 w-5"/> },
                { key: 'newsletter', label: 'Newsletter VIP', icon: <SparklesIcon className="h-5 w-5"/> },
            ]
        },
       {
            title: "Sistema",
            items: [
                { key: 'reports', label: 'Relatórios', icon: <FileIcon className="h-5 w-5"/> },
                { key: 'shipping', label: 'Frete Local', icon: <TruckIcon className="h-5 w-5"/> }, // NOVO ITEM
                { key: 'logs', label: 'Logs do Sistema', icon: <ClipboardDocListIcon className="h-5 w-5"/> },
            ]
        }
    ];

    return (
        <div className="h-screen flex overflow-hidden bg-gray-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-700">
            {/* Overlay Mobile */}
            {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

            {/* Sidebar */}
            <aside className={`bg-white w-72 fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-50 flex flex-col border-r border-gray-200 shadow-xl lg:shadow-none`}>
                {/* Logo Area */}
                <div className="h-16 flex items-center px-6 border-b border-gray-100 flex-shrink-0 bg-white">
                    <div className="flex items-center gap-3 text-indigo-600">
                        <div className="p-1.5 bg-indigo-600 rounded-lg">
                            <AdminIcon className="h-5 w-5 text-white"/>
                        </div>
                        <span className="text-lg font-extrabold tracking-tight text-slate-900">ADMINISTRAÇÃO</span>
                    </div>
                    <button className="lg:hidden ml-auto text-gray-400 hover:text-gray-600" onClick={() => setIsSidebarOpen(false)}>
                        <CloseIcon className="h-6 w-6"/>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-grow p-4 space-y-6 overflow-y-auto custom-scrollbar">
                    {menuGroups.map((group, idx) => (
                        <div key={idx}>
                            <h3 className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{group.title}</h3>
                            <div className="space-y-1">
                                {group.items.map(item => {
                                    const isActive = activePage.startsWith(item.key);
                                    return (
                                        <a 
                                            href="#" 
                                            key={item.key} 
                                            onClick={(e) => { e.preventDefault(); onNavigate(`admin/${item.key}`); setIsSidebarOpen(false); }} 
                                            className={`group flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                                                isActive 
                                                ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' 
                                                : 'text-slate-600 hover:bg-gray-50 hover:text-slate-900'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                                    {item.icon}
                                                </span>
                                                <span>{item.label}</span>
                                            </div>
                                            {item.badge > 0 && (
                                                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* User Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-800 truncate">{user?.name}</p>
                            <p className="text-xs text-slate-500 truncate">Administrador</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => onNavigate('home')} className="flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-white border border-gray-200 text-slate-600 text-xs font-semibold hover:bg-gray-50 hover:text-indigo-600 transition-all shadow-sm">
                            <EyeIcon className="h-3 w-3"/> Ver Loja
                        </button>
                        <button onClick={handleLogout} className="flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-white border border-red-100 text-red-600 text-xs font-semibold hover:bg-red-50 hover:border-red-200 transition-all shadow-sm">
                            <ArrowUturnLeftIcon className="h-3 w-3"/> Sair
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header Topbar */}
                <header className="bg-white/80 backdrop-blur-md h-16 flex items-center justify-between px-6 sm:px-8 flex-shrink-0 z-20 border-b border-gray-200 sticky top-0">
                     <div className="flex items-center gap-4">
                         <button onClick={() => setIsSidebarOpen(true)} className="p-2 lg:hidden text-slate-500 hover:bg-gray-100 rounded-md">
                            <MenuIcon className="h-6 w-6"/>
                         </button>
                         <h1 className="text-xl font-bold text-slate-800 capitalize tracking-tight hidden sm:block">
                            {activePage.split('/')[0].replace('-', ' ')}
                         </h1>
                     </div>
                     <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100 shadow-sm">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-xs font-bold tracking-wide">SISTEMA ONLINE</span>
                        </div>
                     </div>
                </header>

                <main ref={mainContentRef} className="flex-grow p-6 sm:p-8 overflow-y-auto bg-gray-50">
                    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
                        {children}
                    </div>
                </main>
                <BackToTopButton scrollableRef={mainContentRef} />
            </div>
        </div>
    );
});

const AdminShippingSettings = () => {
    const [config, setConfig] = useState({ base_price: 20, rules: [] });
    const [productsData, setProductsData] = useState({ brands: [], categories: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const notification = useNotification();
    const confirmation = useConfirmation(); // Usaremos o hook de confirmação existente

    // Estado para nova regra
    const [newRule, setNewRule] = useState({ type: 'category', value: '', action: 'free_shipping', amount: 0 });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Busca configuração atual
                const configData = await apiService('/settings/shipping-local');
                // Garante que base_price seja número e rules um array
                setConfig({
                    base_price: parseFloat(configData.base_price) || 20,
                    rules: Array.isArray(configData.rules) ? configData.rules : []
                });

                // Busca dados para os selects (Marcas e Categorias)
                const [products, collections] = await Promise.all([
                    apiService('/products/all'),
                    apiService('/collections/admin')
                ]);

                const uniqueBrands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();
                const uniqueCats = [...new Set([...products.map(p => p.category), ...collections.map(c => c.filter)].filter(Boolean))].sort();

                setProductsData({ brands: uniqueBrands, categories: uniqueCats });
            } catch (err) {
                notification.show("Erro ao carregar configurações.", "error");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleAddRule = () => {
        if (!newRule.value) {
            notification.show("Selecione um valor para a regra.", "error");
            return;
        }
        setConfig(prev => ({
            ...prev,
            rules: [...prev.rules, { ...newRule, id: Date.now(), amount: parseFloat(newRule.amount) || 0 }]
        }));
        setNewRule({ type: 'category', value: '', action: 'free_shipping', amount: 0 });
    };

    const handleRemoveRule = (id) => {
        setConfig(prev => ({
            ...prev,
            rules: prev.rules.filter(r => r.id !== id)
        }));
    };

    const handleSave = async () => {
        // Usa o hook de confirmação que já lida com senha/2FA
        confirmation.show(
            "Esta é uma alteração crítica nas regras de frete. Por favor, confirme sua identidade para salvar.",
            async () => {
                setIsSaving(true);
                try {
                    // O confirmation.show já cuidou da verificação prévia (/auth/verify-action),
                    // mas o endpoint específico de settings TAMBÉM pode exigir a senha no corpo se foi configurado assim.
                    // No entanto, se o endpoint de settings pede senha no body, precisamos coletá-la.
                    // O hook `useConfirmation` padrão geralmente apenas verifica a sessão/token.
                    // SE o backend exige a senha NO CORPO da requisição de settings, precisamos de uma abordagem diferente.
                    // Assumindo que o backend exige senha/token NO BODY da requisição PUT:

                    // Como o hook `useConfirmation` do projeto atual é genérico e não retorna o valor digitado (apenas chama o callback),
                    // precisaremos reimplementar um modal simples AQUI ou ajustar a lógica.
                    // Pela estrutura atual do backend que você enviou, ele espera `password` ou `token` no body.
                    
                    // VAMOS SIMPLIFICAR: Como não tenho acesso fácil ao valor digitado no `useConfirmation` padrão sem alterá-lo,
                    // Vou criar um estado local para um modal de confirmação específico deste componente.
                } catch (err) {
                   // ...
                }
            },
            { requiresAuth: false } // Desativamos a auth do hook padrão para usar o nosso modal específico abaixo
        );
        // Ajeitando para usar a lógica correta abaixo com modal local
        setIsAuthModalOpen(true);
    };
    
    // Estados para o Modal de Autenticação Local
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authInput, setAuthInput] = useState('');
    const [isAuthVerify, setIsAuthVerify] = useState(false);

    const confirmSaveWithAuth = async (e) => {
        e.preventDefault();
        setIsAuthVerify(true);
        setIsSaving(true);
        
        try {
            // Garante envio de números corretos
            const payload = {
                base_price: parseFloat(config.base_price),
                rules: config.rules.map(r => ({
                    ...r,
                    amount: parseFloat(r.amount) || 0
                })),
                // Envia a senha ou token dependendo do que for (aqui assumimos senha por padrão, 
                // mas se for 2FA o backend tenta validar como token também se falhar a senha, ou podemos enviar ambos)
                // O backend espera `password` OU `token`. Vamos enviar como `password` se for longo, ou tentar inferir.
                // Mas para ser seguro e compatível com o backend que espera campos distintos:
                password: authInput, 
                token: authInput.length === 6 && !isNaN(authInput) ? authInput : null 
                // Nota: Se a senha for de 6 números, pode dar conflito, mas geralmente senha é mais complexa.
                // O ideal é ter campos separados ou um input inteligente. Vamos mandar nos dois e o backend decide a prioridade.
            };
            
            await apiService('/settings/shipping-local', 'PUT', payload);
            notification.show("Configurações de frete salvas com sucesso!");
            setIsAuthModalOpen(false);
            setAuthInput('');
        } catch (err) {
            notification.show(err.message || "Erro ao salvar. Verifique sua senha/token.", "error");
        } finally {
            setIsSaving(false);
            setIsAuthVerify(false);
        }
    };

    if (isLoading) return <div className="flex justify-center p-10"><SpinnerIcon className="h-8 w-8 text-indigo-600"/></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            
            {/* MODAL DE CONFIRMAÇÃO DE SEGURANÇA */}
            <AnimatePresence>
                {isAuthModalOpen && (
                    <Modal isOpen={true} onClose={() => setIsAuthModalOpen(false)} title="Confirmação de Segurança">
                        <form onSubmit={confirmSaveWithAuth} className="space-y-4">
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                                <p className="text-sm text-yellow-700">
                                    Esta é uma alteração crítica. Por favor, confirme sua <strong>Senha</strong> ou código <strong>2FA</strong> para continuar.
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Senha ou Código 2FA</label>
                                <input 
                                    type="password" 
                                    value={authInput} 
                                    onChange={(e) => setAuthInput(e.target.value)} 
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Digite sua senha ou token..."
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setIsAuthModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-700">Cancelar</button>
                                <button type="submit" disabled={isAuthVerify} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2">
                                    {isAuthVerify && <SpinnerIcon className="h-4 w-4"/>}
                                    Confirmar e Salvar
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>

            <div>
                <h1 className="text-3xl font-bold text-slate-800">Configuração de Entrega Local</h1>
                <p className="text-slate-500">Defina os preços para entregas via Motoboy (João Pessoa).</p>
            </div>

            {/* Configuração Base */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <TruckIcon className="h-5 w-5 text-indigo-600"/> Preço Base
                </h3>
                <div className="flex items-center gap-4">
                    <div className="flex-1 max-w-xs">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor Padrão (R$)</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            value={config.base_price} 
                            onChange={(e) => setConfig({...config, base_price: e.target.value})}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div className="flex-1 text-sm text-gray-500 pt-6">
                        Este valor será cobrado se nenhuma regra específica for aplicada.
                    </div>
                </div>
            </div>

            {/* Regras Avançadas */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <TagIcon className="h-5 w-5 text-indigo-600"/> Regras Específicas
                </h3>
                
                {/* Formulário de Nova Regra */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Se</label>
                        <select 
                            value={newRule.type} 
                            onChange={(e) => setNewRule({...newRule, type: e.target.value, value: ''})}
                            className="w-full p-2 text-sm border rounded-md"
                        >
                            <option value="category">Categoria</option>
                            <option value="brand">Marca</option>
                        </select>
                    </div>
                    <div className="md:col-span-3">
                        <label className="text-xs font-bold text-gray-500 uppercase">For Igual A</label>
                        <select 
                            value={newRule.value} 
                            onChange={(e) => setNewRule({...newRule, value: e.target.value})}
                            className="w-full p-2 text-sm border rounded-md"
                        >
                            <option value="">Selecione...</option>
                            {newRule.type === 'category' 
                                ? productsData.categories.map(c => <option key={c} value={c}>{c}</option>)
                                : productsData.brands.map(b => <option key={b} value={b}>{b}</option>)
                            }
                        </select>
                    </div>
                    <div className="md:col-span-3">
                        <label className="text-xs font-bold text-gray-500 uppercase">Aplicar</label>
                        <select 
                            value={newRule.action} 
                            onChange={(e) => setNewRule({...newRule, action: e.target.value})}
                            className="w-full p-2 text-sm border rounded-md"
                        >
                            <option value="free_shipping">Frete Grátis</option>
                            <option value="surcharge">Acréscimo (+R$)</option>
                            <option value="discount">Desconto (-R$)</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Valor</label>
                        <input 
                            type="number" 
                            disabled={newRule.action === 'free_shipping'}
                            value={newRule.amount}
                            onChange={(e) => setNewRule({...newRule, amount: e.target.value})}
                            className={`w-full p-2 text-sm border rounded-md ${newRule.action === 'free_shipping' ? 'bg-gray-200 cursor-not-allowed' : 'bg-white'}`}
                            placeholder="0.00"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <button 
                            onClick={handleAddRule}
                            className="w-full bg-indigo-600 text-white p-2 rounded-md font-bold text-sm hover:bg-indigo-700 transition-colors"
                        >
                            + Adicionar
                        </button>
                    </div>
                </div>

                {/* Lista de Regras */}
                {config.rules.length === 0 ? (
                    <p className="text-center text-gray-400 py-4 text-sm">Nenhuma regra configurada.</p>
                ) : (
                    <div className="space-y-2">
                        {config.rules.map((rule, index) => (
                            <div key={rule.id || index} className="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm">
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="font-bold bg-gray-100 px-2 py-1 rounded text-gray-600 capitalize">{rule.type === 'category' ? 'Categoria' : 'Marca'}</span>
                                    <span className="text-gray-400">é</span>
                                    <span className="font-bold text-indigo-700">{rule.value}</span>
                                    <span className="text-gray-400">→</span>
                                    {rule.action === 'free_shipping' && <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-200">Frete Grátis</span>}
                                    {rule.action === 'surcharge' && <span className="text-red-600 font-bold">Acréscimo de R$ {Number(rule.amount).toFixed(2)}</span>}
                                    {rule.action === 'discount' && <span className="text-blue-600 font-bold">Desconto de R$ {Number(rule.amount).toFixed(2)}</span>}
                                </div>
                                <button onClick={() => handleRemoveRule(rule.id)} className="text-red-400 hover:text-red-600 p-1">
                                    <TrashIcon className="h-4 w-4"/>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-end pt-4">
                <button 
                    onClick={() => setIsAuthModalOpen(true)} 
                    disabled={isSaving}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 shadow-md flex items-center gap-2 disabled:opacity-70"
                >
                    {isSaving ? <SpinnerIcon className="h-5 w-5"/> : <CheckIcon className="h-5 w-5"/>}
                    Salvar Alterações
                </button>
            </div>
        </div>
    );
};

const AdminDashboard = ({ onNavigate }) => {
    const { user } = useAuth();
    const notification = useNotification();
    const [stats, setStats] = useState({ totalRevenue: 0, totalSales: 0, newCustomers: 0, pendingOrders: 0, prevPeriodRevenue: 0 });
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [selectedStockItem, setSelectedStockItem] = useState(null);
    const [activeFilter, setActiveFilter] = useState('month');
    const [isLoadingData, setIsLoadingData] = useState(true);
    
    // Estados para gráficos
    const [dailySalesData, setDailySalesData] = useState([]);
    const [bestSellersData, setBestSellersData] = useState([]);

    // Funções de exportação
    const runWhenLibsReady = (callback, requiredLibs) => {
        const check = () => {
            const isPdfReady = requiredLibs.includes('pdf') ? (window.jspdf && window.jspdf.jsPDF && typeof window.jspdf.jsPDF.API.autoTable === 'function') : true;
            const isExcelReady = requiredLibs.includes('excel') ? (window.XLSX) : true;
            if (isPdfReady && isExcelReady) callback();
            else setTimeout(check, 100);
        }; check();
    };

    const generatePdf = (data, headers, title) => {
        runWhenLibsReady(() => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const timestamp = new Date().toLocaleString('pt-BR');
            doc.setFontSize(18); doc.text(title, pageWidth / 2, 16, { align: 'center' });
            doc.setFontSize(8); doc.text(timestamp, pageWidth - 14, 10, { align: 'right' });
            doc.autoTable({ head: [headers], body: data, startY: 25 });
            doc.save(`${title.toLowerCase().replace(/ /g, '_')}.pdf`);
        }, ['pdf']);
    };

    const generateExcel = (data, filename) => {
        runWhenLibsReady(() => {
            const wb = window.XLSX.utils.book_new();
            const ws = window.XLSX.utils.json_to_sheet(data);
            window.XLSX.utils.book_append_sheet(wb, ws, "Relatório");
            window.XLSX.writeFile(wb, `${filename}.xlsx`);
        }, ['excel']);
    };

    const handleSalesExport = async (format) => {
        try {
            const orders = await apiService('/orders');
            const data = orders.map(o => ({ Pedido_ID: o.id, Cliente: o.user_name, Data: new Date(o.date).toLocaleDateString(), Total: o.total, Status: o.status }));
            if (format === 'pdf') generatePdf(data.map(Object.values), ['Pedido ID', 'Cliente', 'Data', 'Total', 'Status'], 'Relatorio_Vendas');
            else generateExcel(data, 'relatorio_vendas');
        } catch (error) { notification.show(`Erro exportação: ${error.message}`, 'error'); }
    };

    const handleStockExport = async (format) => {
        try {
            const products = await apiService('/products/all');
            const data = products.map(p => ({ Produto: p.name, Marca: p.brand, Estoque: p.stock, Preço: p.price }));
            if (format === 'pdf') generatePdf(data.map(Object.values), ['Produto', 'Marca', 'Estoque', 'Preço'], 'Relatorio_Estoque');
            else generateExcel(data, 'relatorio_estoque');
        } catch (error) { notification.show(`Erro exportação: ${error.message}`, 'error'); }
    };

    const fetchDashboardData = useCallback((filter = 'month') => {
        setIsLoadingData(true);
        Promise.all([
            apiService(`/reports/dashboard?filter=${filter}`).catch(() => ({ stats: {}, dailySales: [], bestSellers: [] })),
            apiService('/products/low-stock').catch(() => [])
        ]).then(([reportData, lowStockItems]) => {
            const statsData = reportData?.stats || { totalRevenue: 0, totalSales: 0, newCustomers: 0, pendingOrders: 0, prevPeriodRevenue: 0 };
            setStats(statsData);
            setDailySalesData(reportData?.dailySales || []);
            setBestSellersData(reportData?.bestSellers || []);
            setLowStockProducts(lowStockItems || []);
        }).finally(() => setIsLoadingData(false));
    }, []);

    useEffect(() => { fetchDashboardData(activeFilter); }, [activeFilter, fetchDashboardData]);

    useEffect(() => {
        if (!isLoadingData && window.Chart) {
            const renderChart = (id, type, data, options) => {
                const ctx = document.getElementById(id)?.getContext('2d');
                if (ctx) {
                    if (window[`my${id}Chart`]) window[`my${id}Chart`].destroy();
                    window[`my${id}Chart`] = new window.Chart(ctx, { type, data, options });
                }
            };

            const commonOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10, family: 'sans-serif' }, color: '#64748b' } },
                    y: { grid: { borderDash: [2, 4], color: '#f1f5f9' }, ticks: { font: { size: 10 }, color: '#64748b' }, beginAtZero: true }
                }
            };

            const safeLabels = dailySalesData.map(d => {
                if (!d.sale_date) return "";
                const dateObj = new Date(d.sale_date);
                if (isNaN(dateObj.getTime())) {
                     const parts = d.sale_date.split('-');
                     if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('pt-BR');
                     return "";
                }
                return dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            });

            renderChart('dailySalesChart', 'line', {
                labels: safeLabels,
                datasets: [{
                    label: 'Faturamento',
                    data: dailySalesData.map(d => d.daily_total),
                    borderColor: '#4f46e5', // Indigo 600
                    backgroundColor: (context) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                        gradient.addColorStop(0, 'rgba(79, 70, 229, 0.2)');
                        gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');
                        return gradient;
                    },
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    fill: true,
                    tension: 0.4
                }]
            }, commonOptions);

            renderChart('bestSellersChart', 'bar', {
                labels: bestSellersData.map(p => p.name.substring(0, 15) + '...'),
                datasets: [{
                    label: 'Vendas',
                    data: bestSellersData.map(p => p.sales || 0),
                    backgroundColor: '#0ea5e9', // Sky 500
                    borderRadius: 4,
                    barThickness: 20
                }]
            }, { ...commonOptions, indexAxis: 'y' });
        }
    }, [isLoadingData, dailySalesData, bestSellersData]);

    const handleQuickStockSave = () => {
        setIsStockModalOpen(false);
        setSelectedStockItem(null);
        fetchDashboardData(activeFilter);
    };

    const calculateGrowth = () => {
        if (!stats.prevPeriodRevenue) return { text: '--', isPositive: true };
        const current = Number(stats.totalRevenue);
        const prev = Number(stats.prevPeriodRevenue);
        if (prev === 0) return { text: current > 0 ? '+100%' : '0%', isPositive: true };
        const growth = ((current - prev) / prev) * 100;
        return { text: `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`, isPositive: growth >= 0 };
    };
    const growth = calculateGrowth();

    const StatCard = ({ title, value, icon: Icon, growth, subtext, iconBg, iconColor }) => (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition-all duration-300"
        >
            <div>
                <p className="text-sm font-semibold text-gray-500 mb-1 tracking-wide uppercase text-[10px]">{title}</p>
                <h4 className="text-2xl font-extrabold text-slate-800">{value}</h4>
                {(growth || subtext) && (
                    <div className="flex items-center gap-2 mt-2">
                        {growth && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${growth.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {growth.text}
                            </span>
                        )}
                        {subtext && <span className="text-xs text-gray-400">{subtext}</span>}
                    </div>
                )}
            </div>
            <div className={`p-3 rounded-lg ${iconBg}`}>
                <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
        </motion.div>
    );

    const LowStockWidget = () => {
        const [searchTerm, setSearchTerm] = useState('');
        const filtered = lowStockProducts.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                        <ExclamationCircleIcon className="h-5 w-5 text-amber-500" />
                        Reposição Necessária
                    </h3>
                    <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">{lowStockProducts.length}</span>
                </div>
                <div className="p-3 bg-white border-b border-gray-50">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Buscar produto..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                        <SearchIcon className="absolute left-3 top-2 h-3.5 w-3.5 text-gray-400" />
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto max-h-[320px] p-2 space-y-1 custom-scrollbar">
                    {filtered.length > 0 ? filtered.map(item => (
                        <div key={item.id + item.name} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group border border-transparent hover:border-gray-100">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 rounded bg-gray-100 flex-shrink-0 border border-gray-200 p-0.5">
                                    <img src={getFirstImage(item.images)} alt={item.name} className="w-full h-full object-contain rounded-sm" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-700 truncate">{item.name}</p>
                                    <p className="text-[10px] text-slate-400">{item.brand}</p>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0 flex flex-col items-end">
                                <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{item.stock} un.</span>
                                <button 
                                    onClick={() => { setSelectedStockItem(item); setIsStockModalOpen(true); }}
                                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    Repor
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <CheckCircleIcon className="h-8 w-8 text-green-100 mb-2"/>
                            <p className="text-xs">Estoque saudável!</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 pb-10">
            <AnimatePresence>
                {isStockModalOpen && (
                    <QuickStockUpdateModal item={selectedStockItem} onClose={() => setIsStockModalOpen(false)} onSave={handleQuickStockSave} />
                )}
            </AnimatePresence>

            {/* Header com Filtros */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 pb-5">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
                    <p className="text-slate-500 text-sm mt-1">Bem-vindo de volta, {user?.name.split(' ')[0]}. Aqui está o que está acontecendo hoje.</p>
                </div>
                <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                    {['today', 'week', 'month', 'year'].map(f => {
                        const labels = { today: 'Hoje', week: '7 Dias', month: 'Este Mês', year: 'Este Ano' };
                        return (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeFilter === f ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-gray-50'}`}
                            >
                                {labels[f]}
                            </button>
                        );
                    })}
                </div>
            </div>

            {isLoadingData ? (
                <div className="flex justify-center py-20"><SpinnerIcon className="h-10 w-10 text-indigo-500 animate-spin"/></div>
            ) : (
                <>
                    {/* Cards de KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard 
                            title="Faturamento Total" 
                            value={`R$ ${Number(stats.totalRevenue).toFixed(2)}`} 
                            growth={growth}
                            subtext="vs. período anterior"
                            icon={CurrencyDollarIcon}
                            iconBg="bg-green-100"
                            iconColor="text-green-600"
                        />
                        <StatCard 
                            title="Vendas Realizadas" 
                            value={stats.totalSales} 
                            icon={BoxIcon}
                            iconBg="bg-blue-100"
                            iconColor="text-blue-600"
                        />
                        <StatCard 
                            title="Novos Clientes" 
                            value={stats.newCustomers} 
                            icon={UsersIcon}
                            iconBg="bg-purple-100"
                            iconColor="text-purple-600"
                        />
                        <StatCard 
                            title="Pedidos Pendentes" 
                            value={stats.pendingOrders} 
                            icon={ClockIcon}
                            iconBg="bg-amber-100"
                            iconColor="text-amber-600"
                        />
                    </div>

                    {/* Seção de Exportação */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-slate-800 text-lg mb-4">Exportar Relatórios</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button 
                                onClick={() => handleSalesExport('excel')} 
                                className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                            >
                                <DownloadIcon className="h-5 w-5"/> <span>Vendas (Excel)</span>
                            </button>
                            <button 
                                onClick={() => handleStockExport('excel')} 
                                className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                            >
                                <DownloadIcon className="h-5 w-5"/> <span>Estoque (Excel)</span>
                            </button>
                            <button 
                                onClick={() => handleSalesExport('pdf')} 
                                className="bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                            >
                                <DownloadIcon className="h-5 w-5"/> <span>Vendas (PDF)</span>
                            </button>
                        </div>
                    </div>

                    {/* Área Principal: Gráfico e Estoque */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Gráfico Principal */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">Performance de Vendas</h3>
                                    <p className="text-xs text-gray-400">Receita bruta ao longo do tempo</p>
                                </div>
                            </div>
                            <div className="h-80 w-full relative">
                                <canvas id="dailySalesChart"></canvas>
                            </div>
                        </div>

                        {/* Widget Lateral */}
                        <div className="space-y-6">
                            <div className="h-full">
                                <LowStockWidget />
                            </div>
                        </div>
                    </div>

                    {/* Área Inferior: Ações e Secundários */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Gráfico Secundário */}
                        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-slate-800 text-lg mb-4">Top 5 Mais Vendidos</h3>
                            <div className="h-64 relative">
                                <canvas id="bestSellersChart"></canvas>
                            </div>
                        </div>
                        
                        {/* Manutenção e Ações Rápidas */}
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
                                <h3 className="font-bold text-slate-800 mb-2">Status da Loja</h3>
                                <MaintenanceModeToggle />
                            </div>

                            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-xl shadow-lg text-white">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <SparklesIcon className="h-5 w-5 text-amber-400"/> Ações Rápidas
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => onNavigate('admin/products')} className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-left transition-all hover:scale-105 border border-white/5">
                                        <PlusIcon className="h-5 w-5 mb-2 text-green-400"/>
                                        <span className="text-xs font-bold block text-gray-200">Novo Produto</span>
                                    </button>
                                    <button onClick={() => onNavigate('admin/banners')} className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-left transition-all hover:scale-105 border border-white/5">
                                        <PhotoIcon className="h-5 w-5 mb-2 text-blue-400"/>
                                        <span className="text-xs font-bold block text-gray-200">Banners</span>
                                    </button>
                                    <button onClick={() => handleStockExport('excel')} className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-left transition-all hover:scale-105 border border-white/5">
                                        <FileIcon className="h-5 w-5 mb-2 text-amber-400"/>
                                        <span className="text-xs font-bold block text-gray-200">Rel. Estoque</span>
                                    </button>
                                    <button onClick={() => onNavigate('admin/coupons')} className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-left transition-all hover:scale-105 border border-white/5">
                                        <TagIcon className="h-5 w-5 mb-2 text-pink-400"/>
                                        <span className="text-xs font-bold block text-gray-200">Cupom</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
const VariationInputRow = ({ variation, index, onVariationChange, onRemoveVariation, availableColors, availableSizes, onImageUpload, uploadStatus, isFirstOfColor }) => {
    const galleryInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const handleFileChange = (e) => {
        onImageUpload(e);
    };

    const handleRemoveImage = (imgIndex) => {
        const updatedImages = variation.images.filter((_, i) => i !== imgIndex);
        onVariationChange(index, 'images', updatedImages);
    };

    return (
        <div className="group relative grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-4 bg-white rounded-lg border border-gray-200 shadow-sm transition-all hover:shadow-md hover:border-indigo-200">
            {/* Número da Variação (Visual) */}
            <div className="absolute -left-2 -top-2 w-6 h-6 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center text-xs font-bold border border-gray-200 shadow-sm z-10">
                {index + 1}
            </div>

            <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-700 mb-1">Cor</label>
                <div className="relative">
                    <select 
                        value={variation.color} 
                        onChange={(e) => onVariationChange(index, 'color', e.target.value)} 
                        className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block transition-colors"
                    >
                        <option value="">Selecione...</option>
                        {availableColors.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {variation.color && (
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-gray-300 shadow-sm" style={{ backgroundColor: variation.color === 'Multicolorido' ? 'transparent' : variation.color.toLowerCase() }}></div>
                    )}
                </div>
            </div>
            
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Tamanho</label>
                <input 
                    type="text" 
                    list={`available-sizes-${index}`} 
                    value={variation.size} 
                    onChange={(e) => onVariationChange(index, 'size', e.target.value)} 
                    className="w-full p-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 uppercase transition-colors" 
                    placeholder="M, 42..."
                />
                <datalist id={`available-sizes-${index}`}>{availableSizes.map(s => <option key={s} value={s}>{s}</option>)}</datalist>
            </div>
            
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Estoque</label>
                <input 
                    type="number" 
                    min="0" 
                    value={variation.stock} 
                    onChange={(e) => onVariationChange(index, 'stock', parseInt(e.target.value, 10) || 0)} 
                    className="w-full p-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
                    placeholder="0"
                />
            </div>

            <div className={`md:col-span-4 space-y-2 ${!isFirstOfColor ? 'opacity-50 grayscale' : ''}`}>
                 {isFirstOfColor ? (
                    <>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Imagens ({variation.color || 'Geral'})</label>
                        <div className="p-2 border border-dashed border-gray-300 rounded-lg bg-gray-50 min-h-[64px] flex flex-wrap gap-2 items-center transition-colors hover:bg-gray-100">
                            {variation.images && variation.images.length > 0 ? (
                                variation.images.map((img, imgIndex) => (
                                    <div key={imgIndex} className="relative group/img w-10 h-10">
                                        <img src={img} alt="Var" className="w-full h-full object-cover rounded-md border border-gray-200 shadow-sm" />
                                        <button type="button" onClick={() => handleRemoveImage(imgIndex)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-all shadow-sm hover:bg-red-600 transform hover:scale-110">
                                            <XMarkIcon className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))
                            ) : ( 
                                <span className="text-xs text-gray-400 w-full text-center">Sem imagens</span> 
                            )}
                            
                            <div className="flex gap-1 ml-auto">
                                <input type="file" multiple accept="image/*" ref={galleryInputRef} onChange={handleFileChange} className="hidden" />
                                <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileChange} className="hidden" />
                                <button type="button" onClick={() => galleryInputRef.current.click()} className="p-1.5 bg-white border border-gray-200 rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors" title="Galeria"><UploadIcon className="h-4 w-4" /></button>
                                <button type="button" onClick={() => cameraInputRef.current.click()} className="p-1.5 bg-white border border-gray-200 rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors" title="Câmera"><CameraIcon className="h-4 w-4" /></button>
                            </div>
                        </div>
                        {uploadStatus && <p className={`text-[10px] font-medium mt-1 ${uploadStatus.startsWith('Erro') ? 'text-red-500' : 'text-green-600 flex items-center gap-1'} animate-pulse`}><CheckCircleIcon className="h-3 w-3 inline"/> {uploadStatus}</p>}
                    </>
                 ) : (
                    <div className="flex items-center h-full pt-4">
                        <p className="text-xs text-gray-400 italic bg-gray-50 px-2 py-1 rounded border border-gray-100 w-full text-center">Imagens vinculadas à 1ª variação desta cor.</p>
                    </div>
                 )}
            </div>

            <div className="md:col-span-1 flex items-center justify-end h-full pt-6">
                <button type="button" onClick={() => onRemoveVariation(index)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all" title="Remover variação">
                    <TrashIcon className="h-5 w-5"/>
                </button>
            </div>
        </div>
    );
};

const AdminCrudForm = ({ item, onSave, onCancel, fieldsConfig }) => {
    const [formData, setFormData] = useState({});

    useEffect(() => {
        const initialData = {};
        fieldsConfig.forEach(field => {
            let defaultValue = ''; // Valor padrão para campos de texto
            if (field.type === 'checkbox') {
                defaultValue = 0;
            } else if (field.type === 'select' && field.options && field.options.length > 0) {
                defaultValue = field.options[0].value; // Define o padrão como o valor da primeira opção
            }
            initialData[field.name] = item?.[field.name] ?? defaultValue;
        });
        setFormData(initialData);
    }, [item, fieldsConfig]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {fieldsConfig.map(field => (
                <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                    {field.type === 'select' ? (
                        <select
                            name={field.name}
                            value={formData[field.name] || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"
                            required={field.required}
                        >
                            {field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    ) : field.type === 'textarea' ? (
                        <textarea
                            name={field.name}
                            value={formData[field.name] || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                            required={field.required}
                            placeholder={field.placeholder || ''}
                        />
                    ) : field.type === 'checkbox' ? (
                        <div className="flex items-center pt-2">
                             <input
                                type="checkbox"
                                name={field.name}
                                checked={!!formData[field.name]}
                                onChange={handleChange}
                                className="h-4 w-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                            />
                        </div>
                    ) : (
                        <input
                            type={field.type}
                            name={field.name}
                            value={formData[field.name] || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                            required={field.required}
                            placeholder={field.placeholder || ''}
                            readOnly={field.editable === false}
                            step={field.step}
                        />
                    )}
                </div>
            ))}
            <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 font-semibold">Salvar</button>
            </div>
        </form>
    );
};

// Componente Auxiliar para Seções (Movido para fora para evitar perda de foco)
const FormSection = ({ title, icon: Icon, children }) => (
    <div className="bg-white p-5 md:p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3">
            {Icon && <Icon className="h-5 w-5 text-indigo-600" />}
            {title}
        </h3>
        {children}
    </div>
);

const ProductForm = ({ item, onSave, onCancel, productType, setProductType, brands = [], categories = [] }) => {
    const [formData, setFormData] = useState({});
    const [uploadStatus, setUploadStatus] = useState('');
    const [uploadingStatus, setUploadingStatus] = useState({});
    
    // Novos estados para controlar o modo de promoção
    const [promoMode, setPromoMode] = useState('fixed'); 
    const [promoPercent, setPromoPercent] = useState('');
    
    // Estado para controlar quais cores estão na promoção (apenas para roupas)
    const [promoSelectedColors, setPromoSelectedColors] = useState([]);

    const mainGalleryInputRef = useRef(null);
    const mainCameraInputRef = useRef(null);
    const [allCollectionCategories, setAllCollectionCategories] = useState([]);

    useEffect(() => {
        apiService('/collections/admin')
            .then(data => setAllCollectionCategories(data.filter(c => c.is_active)))
            .catch(err => console.error("Falha ao buscar categorias de coleção", err));
    }, []);
    
    const perfumeBrands = ["O Boticário", "Avon", "Natura", "Eudora"];

    const perfumeFields = [
        { name: 'stock', label: 'Estoque Total', type: 'number', required: true, placeholder: '0' },
        { name: 'volume', label: 'Volume (ex: 100ml)', type: 'text', placeholder: '100ml' },
        { name: 'notes', label: 'Notas Olfativas', type: 'textarea', placeholder: 'Topo: ...\nCorpo: ...\nFundo: ...' },
        { name: 'how_to_use', label: 'Como Usar', type: 'textarea', placeholder: 'Instruções de aplicação...' },
        { name: 'ideal_for', label: 'Ideal Para', type: 'textarea', placeholder: 'Ocasiões, tipo de pele...' },
    ];
    
    const clothingFields = [
        { name: 'variations', label: 'Grade de Variações', type: 'variations' },
        { name: 'size_guide', label: 'Guia de Medidas (HTML/Texto)', type: 'textarea', placeholder: '<p>P: 38cm</p>...' },
        { name: 'care_instructions', label: 'Cuidados com a Peça', type: 'textarea', placeholder: 'Lavar à mão\nNão usar alvejante...' },
    ];

   const commonFields = [
        { name: 'name', label: 'Nome do Produto', type: 'text', required: true, placeholder: 'Ex: Perfume Floral ou Vestido Longo' },
        { name: 'brand', label: 'Marca', type: 'text', required: true, placeholder: 'Selecione ou digite...' },
        { name: 'category', label: 'Categoria', type: 'text', required: true, placeholder: 'Selecione...' },
        { name: 'price', label: 'Preço Original (R$)', type: 'number', required: true, step: '0.01', placeholder: '0.00' },
        { name: 'video_url', label: 'Vídeo do YouTube (URL)', type: 'url', placeholder: 'https://www.youtube.com/watch?v=...' },
        { name: 'images_upload', label: 'Upload de Imagens Principais', type: 'file' },
        { name: 'images', label: 'URLs das Imagens Principais', type: 'text_array' },
        { name: 'description', label: 'Descrição Detalhada', type: 'textarea', placeholder: 'Descreva os detalhes e benefícios do produto...' },
        { name: 'weight', label: 'Peso (kg)', type: 'number', step: '0.01', required: true, placeholder: '0.5' },
        { name: 'width', label: 'Largura (cm)', type: 'number', required: true, placeholder: '10' },
        { name: 'height', label: 'Altura (cm)', type: 'number', required: true, placeholder: '10' },
        { name: 'length', label: 'Comprimento (cm)', type: 'number', required: true, placeholder: '10' },
        { name: 'is_active', label: 'Produto Ativo', type: 'checkbox' },
    ];

    useEffect(() => {
        const initialData = {};
        const allFields = [...commonFields, ...perfumeFields, ...clothingFields];

        allFields.forEach(field => {
            const value = item?.[field.name];
            if (value !== undefined && value !== null) {
                initialData[field.name] = value;
            } else {
                if (field.type === 'checkbox') {
                    initialData[field.name] = (field.name === 'is_active'); 
                } else if (field.type === 'number') {
                    initialData[field.name] = 0; 
                } else if (field.name === 'images' || field.name === 'variations') {
                    initialData[field.name] = [];
                } else {
                    initialData[field.name] = '';
                }
            }
        });
        
        if (item) {
            setProductType(item.product_type || 'perfume');
            // Garante que images seja um array válido
            initialData.images = parseJsonString(item.images, []);
            initialData.variations = parseJsonString(item.variations, []);
            
            initialData.is_on_sale = !!item.is_on_sale;
            initialData.sale_price = item.sale_price || '';
            
            if (item.sale_end_date) {
                const date = new Date(item.sale_end_date);
                const localISOTime = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                initialData.sale_end_date = localISOTime;
            } else {
                initialData.sale_end_date = '';
            }

            if (item.is_on_sale && item.price > 0 && item.sale_price > 0) {
                 const percent = Math.round(((item.price - item.sale_price) / item.price) * 100);
                 setPromoPercent(percent);
            }
            
            if (item.product_type === 'clothing') {
                const vars = parseJsonString(item.variations, []);
                if (item.is_on_sale) {
                    const activePromoColors = vars
                        .filter(v => v.color && v.is_promo !== false)
                        .map(v => v.color);
                    setPromoSelectedColors([...new Set(activePromoColors)]);
                } else {
                    const allColors = vars.filter(v => v.color).map(v => v.color);
                    setPromoSelectedColors([...new Set(allColors)]);
                }
            }

        } else {
            setProductType('perfume');
            initialData.images = []; // Garante array vazio para novo produto
            initialData.is_on_sale = false;
            initialData.sale_price = '';
            initialData.sale_end_date = '';
        }

        setFormData(initialData);
    }, [item, setProductType]);

    const availableProductCategories = useMemo(() => {
        return allCollectionCategories.filter(c => c.product_type_association === productType);
    }, [allCollectionCategories, productType]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? (checked ? 1 : 0) : value;

        setFormData(prev => {
            const updated = { ...prev, [name]: newValue };
            if (name === 'price' && promoMode === 'percentage' && promoPercent) {
                const original = parseFloat(newValue);
                if (!isNaN(original)) {
                    const discount = original * (parseFloat(promoPercent) / 100);
                    updated.sale_price = (original - discount).toFixed(2);
                }
            }
            return updated;
        });
    };

    // Handler atualizado para limpar dados e corrigir o bug visual
    const handlePromoToggle = (e) => {
        const isChecked = e.target.checked;
        
        setFormData(prev => ({
            ...prev,
            is_on_sale: isChecked ? 1 : 0,
            // Limpa os campos de promoção se desmarcar para evitar sujeira
            sale_price: isChecked ? prev.sale_price : '',
            sale_end_date: isChecked ? prev.sale_end_date : ''
        }));
        
        if (isChecked && productType === 'clothing') {
            const currentColors = [...new Set((formData.variations || []).filter(v => v.color).map(v => v.color))];
            setPromoSelectedColors(currentColors);
        } else if (!isChecked) {
            setPromoSelectedColors([]);
        }
    };

    const togglePromoColor = (color) => {
        setPromoSelectedColors(prev => {
            if (prev.includes(color)) {
                return prev.filter(c => c !== color);
            } else {
                return [...prev, color];
            }
        });
    };

    const handleVolumeBlur = (e) => {
        let { value } = e.target;
        if (value && value.trim() !== '' && !isNaN(parseFloat(value)) && !/ml/i.test(value)) {
            const formattedValue = `${parseFloat(value)}ml`;
            setFormData(prev => ({ ...prev, volume: formattedValue }));
        }
    };
    
    // --- LÓGICA DE UPLOAD DE IMAGEM ---
    const handleImageArrayChange = (index, value) => {
        const newImages = [...(formData.images || [])];
        newImages[index] = value;
        setFormData(prev => ({...prev, images: newImages}));
    };
    
    const addImageField = () => {
        setFormData(prev => ({...prev, images: [...(prev.images || []), '']}));
    };

    const removeImageField = (index) => {
        const newImages = (formData.images || []).filter((_, i) => i !== index);
        setFormData(prev => ({...prev, images: newImages}));
    };
    
    const handleImageChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploadStatus(`Enviando ${files.length} imagem(ns)...`);
        try {
            const uploadPromises = files.map(file => apiImageUploadService('/upload/image', file));
            const responses = await Promise.all(uploadPromises);
            const newImageUrls = responses.map(res => res.imageUrl);
            
            setFormData(prev => {
                // Garante que prev.images seja um array antes de espalhar
                const currentImages = Array.isArray(prev.images) ? prev.images : [];
                return {
                    ...prev, 
                    images: [...currentImages, ...newImageUrls]
                };
            });
            
            setUploadStatus('Upload concluído com sucesso!');
            e.target.value = ''; 
            setTimeout(() => setUploadStatus(''), 3000);
        } catch (error) {
            console.error("Erro no upload:", error);
            setUploadStatus(`Erro no upload: ${error.message}`);
        }
    };
    
    const handleVariationChange = (index, field, value) => {
        const newVariations = [...formData.variations];
        newVariations[index][field] = value;
        setFormData(prev => ({ ...prev, variations: newVariations }));

        if (field === 'color' && value && formData.is_on_sale) {
            setPromoSelectedColors(prev => {
                if (!prev.includes(value)) return [...prev, value];
                return prev;
            });
        }
    };
    
    const handleVariationImageUpload = async (index, e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploadingStatus(prev => ({ ...prev, [index]: 'Enviando...' }));
        try {
            const uploadPromises = files.map(file => apiImageUploadService('/upload/image', file));
            const responses = await Promise.all(uploadPromises);
            const newImageUrls = responses.map(res => res.imageUrl);
            
            const newVariations = [...formData.variations];
            const currentImages = Array.isArray(newVariations[index].images) ? newVariations[index].images : [];
            newVariations[index].images = [...currentImages, ...newImageUrls];
            setFormData(prev => ({ ...prev, variations: newVariations }));
            
            setUploadingStatus(prev => ({ ...prev, [index]: `${files.length} imagem(ns) enviada(s)!` }));
            e.target.value = '';
            setTimeout(() => setUploadingStatus(prev => ({ ...prev, [index]: '' })), 3000);
        } catch (error) {
            setUploadingStatus(prev => ({ ...prev, [index]: `Erro: ${error.message}` }));
        }
    };

    const addVariation = () => {
        setFormData(prev => ({
            ...prev,
            variations: [...(prev.variations || []), { color: '', size: '', stock: 0, images: [] }]
        }));
    };

    const removeVariation = (index) => {
        const newVariations = formData.variations.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, variations: newVariations }));
    };

    const handlePromoModeChange = (mode) => {
        setPromoMode(mode);
        if (mode === 'percentage') {
            if (formData.price && formData.sale_price) {
                const original = parseFloat(formData.price);
                const sale = parseFloat(formData.sale_price);
                if (original > 0) {
                    const percent = ((original - sale) / original) * 100;
                    setPromoPercent(Math.round(percent));
                }
            }
        } else { setPromoPercent(''); }
    };

    const handlePercentChange = (e) => {
        const percent = e.target.value;
        setPromoPercent(percent);
        if (formData.price && percent !== '') {
            const original = parseFloat(formData.price);
            if (!isNaN(original)) {
                const discount = original * (parseFloat(percent) / 100);
                const newSalePrice = (original - discount).toFixed(2);
                setFormData(prev => ({ ...prev, sale_price: newSalePrice }));
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const dataToSubmit = { ...formData };
        dataToSubmit.product_type = productType;

        if (dataToSubmit.sale_end_date) {
            const localDate = new Date(dataToSubmit.sale_end_date);
            dataToSubmit.sale_end_date = localDate.toISOString();
        }

        if (productType === 'perfume') {
            clothingFields.forEach(field => delete dataToSubmit[field.name]);
            dataToSubmit.variations = '[]';
            dataToSubmit.stock = parseInt(dataToSubmit.stock, 10) || 0;
        } else if (productType === 'clothing') {
            perfumeFields.forEach(field => delete dataToSubmit[field.name]);

            const colorImageMap = new Map();
            (dataToSubmit.variations || []).forEach(v => {
                if (v.color && !colorImageMap.has(v.color)) {
                    colorImageMap.set(v.color, v.images || []);
                }
            });

            const syncedVariations = (dataToSubmit.variations || []).map(v => ({
                ...v,
                images: v.color ? colorImageMap.get(v.color) : [],
                is_promo: dataToSubmit.is_on_sale && promoSelectedColors.includes(v.color)
            }));

            dataToSubmit.variations = syncedVariations;
            const totalStock = (dataToSubmit.variations || []).reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0);
            dataToSubmit.stock = totalStock;
        }

        dataToSubmit.images = JSON.stringify(dataToSubmit.images?.filter(img => img && img.trim() !== '') || []);
        if (dataToSubmit.variations) {
            dataToSubmit.variations = JSON.stringify(dataToSubmit.variations);
        }
        
        delete dataToSubmit.images_upload; 
        onSave(dataToSubmit);
    };
    
    // Lista Padrão de Cores
    const PREDEFINED_COLORS = [
        "Amarelo", "Azul", "Azul Bebê", "Azul Marinho", "Azul Royal", "Bege", "Bordô", 
        "Branco", "Caqui", "Caramelo", "Cinza", "Cinza Chumbo", "Coral", "Creme", 
        "Dourado", "Estampado", "Fúcsia", "Goiaba", "Jeans", "Jeans Claro", "Jeans Escuro", 
        "Laranja", "Lilás", "Marrom", "Marsala", "Mostarda", "Multicolorido", "Nude", 
        "Off-White", "Ouro", "Prata", "Prateado", "Preto", "Rosa", "Rosa Bebê", "Rosa Choque", 
        "Rosê", "Roxo", "Salmão", "Terracota", "Turquesa", "Verde", "Verde Água", "Verde Bandeira", 
        "Verde Limão", "Verde Militar", "Vermelho", "Vinho", "Violeta"
    ];

    const allColors = useMemo(() => {
        const dbColors = categories.filter(c => c.type === 'color').map(c => c.name);
        return [...new Set([...PREDEFINED_COLORS, ...dbColors])].sort();
    }, [categories]);
    
    const currentVariationColors = useMemo(() => {
        return [...new Set((formData.variations || []).filter(v => v.color).map(v => v.color))].sort();
    }, [formData.variations]);

    const availableSizes = useMemo(() => [...new Set(categories.filter(c => c.type === 'size').map(c => c.name))], [categories]);

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-50/50 p-1">
            {/* --- SELETOR DE TIPO --- */}
            <div className="bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm flex relative">
                <button type="button" onClick={() => setProductType('perfume')} className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 z-10 ${productType === 'perfume' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <SparklesIcon className="h-5 w-5" /> Perfume
                </button>
                <button type="button" onClick={() => setProductType('clothing')} className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 z-10 ${productType === 'clothing' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <ShirtIcon className="h-5 w-5" /> Roupa
                </button>
            </div>

            {/* --- INFORMAÇÕES BÁSICAS --- */}
            <FormSection title="Informações Básicas" icon={FileIcon}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Produto <span className="text-red-500">*</span></label>
                        <input type="text" name="name" value={formData.name || ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium" placeholder="Ex: Perfume Floral ou Vestido Longo" required />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Categoria <span className="text-red-500">*</span></label>
                        <select name="category" value={formData.category || ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm" required>
                            <option value="">Selecione...</option>
                            {availableProductCategories.map(cat => <option key={cat.id} value={cat.filter}>{cat.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Marca <span className="text-red-500">*</span></label>
                        {productType === 'perfume' ? (
                             <select name="brand" value={formData.brand || ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm" required>
                                <option value="">Selecione...</option>
                                {perfumeBrands.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        ) : (
                            <>
                                <input type="text" name="brand" value={formData.brand || ''} onChange={handleChange} list="brand-datalist" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm" required placeholder="Digite ou selecione..." />
                                <datalist id="brand-datalist">{brands.map(opt => <option key={opt} value={opt} />)}</datalist>
                            </>
                        )}
                    </div>
                    
                    <div className="md:col-span-2 flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="relative flex items-start">
                            <div className="flex items-center h-5">
                                <input id="is_active" name="is_active" type="checkbox" checked={!!formData.is_active} onChange={handleChange} className="focus:ring-indigo-500 h-5 w-5 text-indigo-600 border-gray-300 rounded cursor-pointer" />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="is_active" className="font-bold text-gray-700 cursor-pointer">Produto Ativo</label>
                                <p className="text-gray-500 text-xs">Se desmarcado, o produto ficará oculto na loja.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </FormSection>

             {/* --- PREÇO E ESTOQUE --- */}
             <FormSection title="Preço e Promoção" icon={CurrencyDollarIcon}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Preço Original (R$) <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                            <input type="number" name="price" value={formData.price || ''} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-bold text-gray-900" placeholder="0.00" step="0.01" required />
                        </div>
                    </div>

                    {/* Lógica de Estoque para Perfumes (Roupas usam variações) */}
                    {productType === 'perfume' && (
                        <div>
                             <label className="block text-sm font-bold text-gray-700 mb-1">Estoque Total <span className="text-red-500">*</span></label>
                             <input type="number" name="stock" value={formData.stock || ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-bold" placeholder="0" min="0" required />
                        </div>
                    )}
                </div>

                {/* Card de Promoção */}
                <div className={`mt-4 border-2 rounded-xl p-5 transition-all ${!!formData.is_on_sale ? 'bg-amber-50 border-amber-300 shadow-inner' : 'bg-gray-50 border-dashed border-gray-300'}`}>
                    <div className="flex items-center mb-4">
                         <input type="checkbox" id="is_on_sale" name="is_on_sale" checked={!!formData.is_on_sale} onChange={handlePromoToggle} className="h-5 w-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500 cursor-pointer" />
                         <label htmlFor="is_on_sale" className="ml-3 font-bold text-gray-800 cursor-pointer select-none">Habilitar Promoção</label>
                    </div>

                    {!!formData.is_on_sale && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                            <div className="flex gap-4 p-2 bg-white rounded-lg border border-amber-100">
                                <label className="flex items-center cursor-pointer px-2">
                                    <input type="radio" name="promoMode" value="fixed" checked={promoMode === 'fixed'} onChange={() => handlePromoModeChange('fixed')} className="text-amber-600 focus:ring-amber-500"/>
                                    <span className="ml-2 text-sm font-medium">Preço Fixo</span>
                                </label>
                                <label className="flex items-center cursor-pointer px-2">
                                    <input type="radio" name="promoMode" value="percentage" checked={promoMode === 'percentage'} onChange={() => handlePromoModeChange('percentage')} className="text-amber-600 focus:ring-amber-500"/>
                                    <span className="ml-2 text-sm font-medium">Porcentagem (%)</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Desconto (%)</label>
                                    <div className="relative">
                                        <input type="number" value={promoPercent} onChange={handlePercentChange} disabled={promoMode !== 'percentage'} className={`block w-full pr-8 pl-3 py-2 border rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 ${promoMode !== 'percentage' ? 'bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-300'}`} min="0" max="100"/>
                                        <span className="absolute right-3 top-2 text-xs text-gray-400">%</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preço Final</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-xs text-gray-500">R$</span>
                                        <input type="number" name="sale_price" value={formData.sale_price || ''} onChange={handleChange} disabled={promoMode !== 'fixed'} className={`block w-full pl-8 pr-3 py-2 border rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 ${promoMode !== 'fixed' ? 'bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-300'}`} step="0.01" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fim da Promoção (Opcional)</label>
                                    <input type="datetime-local" name="sale_end_date" value={formData.sale_end_date || ''} onChange={handleChange} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 bg-white" />
                                </div>
                            </div>
                            
                            {/* Seleção de Cores para Promoção (Roupas) */}
                            {productType === 'clothing' && currentVariationColors.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-yellow-200">
                                    <label className="block text-sm font-bold text-gray-800 mb-2">Aplicar Desconto nas Cores:</label>
                                    <div className="flex flex-wrap gap-2">
                                        {currentVariationColors.map(color => (
                                            <label key={color} className={`flex items-center space-x-2 px-3 py-1.5 rounded-md border cursor-pointer select-none transition-colors ${promoSelectedColors.includes(color) ? 'bg-green-100 border-green-500 text-green-800' : 'bg-white border-gray-300 text-gray-500 opacity-60'}`}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={promoSelectedColors.includes(color)}
                                                    onChange={() => togglePromoColor(color)}
                                                    className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                                />
                                                <span className="text-sm font-bold">{color}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">Novas cores adicionadas entrarão automaticamente na promoção.</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
             </FormSection>

            {/* --- DETALHES ESPECÍFICOS --- */}
            {productType === 'perfume' && (
                <FormSection title="Detalhes do Perfume" icon={SparklesIcon}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                         <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Volume</label>
                            <input type="text" name="volume" value={formData.volume || ''} onChange={handleChange} onBlur={handleVolumeBlur} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Ex: 100ml" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Notas Olfativas</label>
                            <textarea name="notes" value={formData.notes || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm h-24" placeholder="Topo: ...&#10;Corpo: ...&#10;Fundo: ..."></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Como Usar</label>
                            <textarea name="how_to_use" value={formData.how_to_use || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm h-20"></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Ideal Para</label>
                            <textarea name="ideal_for" value={formData.ideal_for || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm h-20"></textarea>
                        </div>
                    </div>
                </FormSection>
            )}

            {productType === 'clothing' && (
                 <FormSection title="Variações e Tamanhos" icon={ShirtIcon}>
                    {/* Lista de Variações */}
                    <div className="space-y-4 mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-gray-700">Grade de Cores e Tamanhos</label>
                            <button type="button" onClick={addVariation} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-bold border border-indigo-200 transition-colors">
                                + Adicionar Variação
                            </button>
                        </div>
                        
                        {(formData.variations || []).length > 0 ? (
                            (formData.variations || []).map((v, i) => {
                                const seenColors = new Set();
                                // Helper simples para identificar primeira ocorrência visualmente
                                const isFirst = (formData.variations || []).findIndex(va => va.color === v.color) === i;
                                return (
                                    <VariationInputRow 
                                        key={i} 
                                        variation={v} 
                                        index={i} 
                                        onVariationChange={handleVariationChange}
                                        onRemoveVariation={removeVariation}
                                        availableColors={allColors}
                                        availableSizes={availableSizes}
                                        onImageUpload={(e) => handleVariationImageUpload(i, e)}
                                        uploadStatus={uploadingStatus[i]}
                                        isFirstOfColor={isFirst}
                                    />
                                );
                            })
                        ) : (
                            <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                                <p className="text-gray-500 text-sm mb-2">Nenhuma variação adicionada.</p>
                                <button type="button" onClick={addVariation} className="text-indigo-600 font-bold text-sm hover:underline">Clique para adicionar cor/tamanho</button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-gray-100">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Guia de Medidas (HTML/Texto)</label>
                            <textarea name="size_guide" value={formData.size_guide || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm h-32 font-mono text-xs"></textarea>
                        </div>
                        <div>
                             <label className="block text-sm font-bold text-gray-700 mb-1">Cuidados com a Peça</label>
                            <textarea name="care_instructions" value={formData.care_instructions || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm h-32"></textarea>
                        </div>
                    </div>
                 </FormSection>
            )}

            {/* --- MÍDIA --- */}
            <FormSection title="Imagens Principais e Vídeo" icon={PhotoIcon}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Upload Rápido</label>
                         <div className="flex gap-2 mb-2">
                             <input type="file" multiple accept="image/*" ref={mainGalleryInputRef} onChange={handleImageChange} className="hidden" />
                             <button type="button" onClick={() => mainGalleryInputRef.current.click()} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg flex flex-col items-center justify-center gap-1 border border-gray-300 transition-colors">
                                <UploadIcon className="h-6 w-6 text-gray-500" />
                                <span className="text-xs font-bold">Galeria</span>
                             </button>
                             <input type="file" accept="image/*" capture="environment" ref={mainCameraInputRef} onChange={handleImageChange} className="hidden" />
                             <button type="button" onClick={() => mainCameraInputRef.current.click()} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg flex flex-col items-center justify-center gap-1 border border-gray-300 transition-colors">
                                <CameraIcon className="h-6 w-6 text-gray-500" />
                                <span className="text-xs font-bold">Câmera</span>
                             </button>
                         </div>
                         {uploadStatus && <p className={`text-xs font-bold text-center ${uploadStatus.startsWith('Erro') ? 'text-red-500' : 'text-green-600'} animate-pulse`}>{uploadStatus}</p>}
                    </div>

                    <div className="lg:col-span-2 space-y-3">
                        <label className="block text-sm font-bold text-gray-700">URLs das Imagens (Ou gerenciamento)</label>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                            {(formData.images || []).map((img, index) => (
                                <div key={index} className="flex items-center gap-2 group">
                                    <div className="w-10 h-10 rounded border border-gray-200 bg-gray-100 flex-shrink-0 overflow-hidden">
                                        <img src={img || 'https://placehold.co/40x40/eee/ccc?text=?'} alt="Thumb" className="w-full h-full object-cover" />
                                    </div>
                                    <input type="text" value={img} onChange={(e) => handleImageArrayChange(index, e.target.value)} className="flex-grow px-3 py-2 bg-white border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 text-gray-600" placeholder="https://..." />
                                    <button type="button" onClick={() => removeImageField(index)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><TrashIcon className="h-4 w-4"/></button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addImageField} className="text-xs font-bold text-indigo-600 hover:underline">+ Adicionar campo de URL</button>
                    </div>

                    <div className="lg:col-span-3">
                         <label className="block text-sm font-bold text-gray-700 mb-1">Link do Vídeo (YouTube)</label>
                         <input type="url" name="video_url" value={formData.video_url || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="https://www.youtube.com/watch?v=..." />
                    </div>
                </div>
            </FormSection>

            {/* --- DETALHES GERAIS E DIMENSÕES --- */}
            <FormSection title="Descrição e Entrega" icon={BoxIcon}>
                 <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Descrição Completa</label>
                        <textarea name="description" value={formData.description || ''} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm h-32" placeholder="Descreva os detalhes, benefícios e diferenciais do produto..."></textarea>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div className="md:col-span-4 mb-1">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Dimensões para Frete</p>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Peso (kg)</label>
                            <input type="number" name="weight" value={formData.weight || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-sm" step="0.01" required />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Largura (cm)</label>
                            <input type="number" name="width" value={formData.width || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-sm" required />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Altura (cm)</label>
                            <input type="number" name="height" value={formData.height || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-sm" required />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Comp. (cm)</label>
                            <input type="number" name="length" value={formData.length || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-sm" required />
                        </div>
                    </div>
                 </div>
            </FormSection>

            {/* --- AÇÕES FIXAS --- */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-1 flex justify-end gap-3 rounded-b-lg shadow-lg z-20">
                <button type="button" onClick={onCancel} className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors">
                    Cancelar
                </button>
                <button type="submit" className="px-8 py-2.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md transition-all transform active:scale-95 flex items-center gap-2">
                    <CheckIcon className="h-5 w-5"/>
                    Salvar Produto
                </button>
            </div>
        </form>
    );
};

const FileUploadArea = ({ onFileSelect }) => {
    const [dragging, setDragging] = useState(false);
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef(null);

    const handleDragEvents = (e, isDragging) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(isDragging);
    };

    const handleDrop = (e) => {
        handleDragEvents(e, false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            setFileName(files[0].name);
            onFileSelect(files[0]);
        }
    };
    
    const handleFileChange = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setFileName(files[0].name);
            onFileSelect(files[0]);
        }
    };
    
    const triggerFileSelect = () => fileInputRef.current.click();

    return (
        <div 
            className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${dragging ? 'border-amber-500 bg-amber-50' : 'border-gray-300 hover:border-gray-400'}`}
            onDragEnter={(e) => handleDragEvents(e, true)}
            onDragOver={(e) => handleDragEvents(e, true)}
            onDragLeave={(e) => handleDragEvents(e, false)}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
        >
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleFileChange}
            />
            <UploadIcon className="h-10 w-10 mx-auto text-gray-400 mb-2"/>
            {fileName ? (
                <div>
                    <p className="font-semibold text-gray-800">{fileName}</p>
                    <p className="text-xs text-gray-500">Clique ou arraste outro arquivo para substituir</p>
                </div>
            ) : (
                <p className="text-gray-600">Arraste e solte o arquivo CSV aqui, ou <span className="text-amber-600 font-semibold">clique para selecionar</span>.</p>
            )}
        </div>
    );
}

const DownloadTemplateButton = ({ productType }) => {
    const handleDownload = () => {
        let headers, exampleRow, filename;
        if (productType === 'perfume') {
            headers = "name,brand,category,price,sale_price,stock,images,description,notes,how_to_use,ideal_for,volume,weight,width,height,length,is_active,is_on_sale,product_type";
            exampleRow = "Meu Perfume,O Boticário,Perfumes Feminino,199.90,149.90,50,https://example.com/img1.png,Descrição do meu perfume,Topo: Limão\\nCorpo: Jasmim,Aplicar na pele,\"Para todos os momentos, dia e noite\",100ml,0.4,12,18,12,1,1,perfume";
            filename = "modelo_perfumes.csv";
        } else { // clothing
            headers = "name,brand,category,price,sale_price,images,description,variations,size_guide,care_instructions,weight,width,height,length,is_active,is_on_sale,product_type";
            exampleRow = "Minha Camisa,Minha Marca,Blusas,99.90,79.90,[]\t,Descrição da camisa,\"[{\\\"color\\\":\\\"Azul\\\",\\\"size\\\":\\\"M\\\",\\\"stock\\\":10,\\\"images\\\":[\\\"url1\\\"]},{\\\"color\\\":\\\"Preto\\\",\\\"size\\\":\\\"M\\\",\\\"stock\\\":5,\\\"images\\\":[]}]\",<p>Busto: 90cm</p>,Lavar a mão,0.3,30,40,2,1,1,clothing";
            filename = "modelo_roupas.csv";
        }
        
        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + exampleRow;
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <button onClick={handleDownload} className="text-sm text-blue-600 hover:text-blue-800 underline">
            Baixar modelo CSV de {productType === 'perfume' ? 'Perfumes' : 'Roupas'}
        </button>
    );
};

const QuickStockUpdateModal = ({ item, onClose, onSave }) => {
    const [stock, setStock] = useState(item.stock);
    const [isSaving, setIsSaving] = useState(false);
    const notification = useNotification();

    const handleSave = async () => {
       // console.log('QuickStockUpdateModal - Item recebido:', JSON.stringify(item, null, 2)); // Removido ou comentado
        setIsSaving(true);
        try {
            const payload = {
            productId: item.id,
            newStock: parseInt(stock, 10),
            // CORREÇÃO: Certifica que o objeto `variation` está sendo enviado corretamente
            // O `item` recebido já contém a estrutura correta vinda do `lowStockProducts`
            variation: item.product_type === 'clothing' ? item.variation : null
        };
        // console.log('QuickStockUpdateModal - Payload a ser enviado:', JSON.stringify(payload, null, 2)); // Removido ou comentado
            // CORREÇÃO: Removido o "/api" duplicado.
            await apiService('/products/stock-update', 'PUT', payload);
            notification.show('Estoque atualizado com sucesso!');
            onSave(); // Fecha o modal e atualiza a lista
        } catch (error) {
            notification.show(`Erro ao atualizar estoque: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Atualização Rápida de Estoque" size="sm">
            <div className="space-y-4">
                <p className="font-semibold text-lg">{item.name}</p>
                <div className="flex items-center gap-4">
                    <label className="font-medium text-gray-700">Novo Estoque:</label>
                    <input
                        type="number"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                    />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 disabled:bg-gray-400 flex items-center justify-center"
                    >
                        {isSaving ? <SpinnerIcon /> : 'Salvar'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const AdminProducts = ({ onNavigate }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const confirmation = useConfirmation();
  const notification = useNotification();
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importMessage, setImportMessage] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  
  // Estados para Promoção em Massa
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isBulkPromoModalOpen, setIsBulkPromoModalOpen] = useState(false);
  const [bulkDiscount, setBulkDiscount] = useState(10);
  const [isBulkLimitedTime, setIsBulkLimitedTime] = useState(false);
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);
  const [isClearingPromos, setIsClearingPromos] = useState(false); 

  const [searchTerm, setSearchTerm] = useState('');
  const [uniqueBrands, setUniqueBrands] = useState([]);
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [productType, setProductType] = useState('perfume');
  
  const LOW_STOCK_THRESHOLD = 5;

  const AdminCountdown = ({ endDate }) => {
      const [timeLeft, setTimeLeft] = useState('');
      
      useEffect(() => {
          const calculate = () => {
              if (!endDate) {
                  setTimeLeft('');
                  return;
              }
              const diff = new Date(endDate).getTime() - new Date().getTime();
              
              if (diff <= 0) {
                  setTimeLeft('Expirado');
                  return;
              }
              
              const d = Math.floor(diff / (1000 * 60 * 60 * 24));
              const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
              const m = Math.floor((diff / 1000 / 60) % 60);
              
              if (d > 0) {
                  setTimeLeft(`${d}d ${h}h`);
              } else {
                  setTimeLeft(`${h}h ${m}m`);
              }
          };
          calculate();
          const timer = setInterval(calculate, 60000); 
          return () => clearInterval(timer);
      }, [endDate]);

      if (!timeLeft) return null;
      if (timeLeft === 'Expirado') return <span className="text-gray-500 text-[10px] font-bold">Expirado</span>;
      return <span className="text-red-600 font-bold text-[10px] animate-pulse">{timeLeft}</span>;
  };

  const fetchProducts = useCallback(() => {
    apiService(`/products/all`)
        .then(data => {
            setProducts(data);
            const brands = [...new Set(data.map(p => p.brand).filter(b => b))];
            
            const categorySet = new Set();
            data.forEach(p => {
                if (p.category) categorySet.add(JSON.stringify({ name: p.category, type: 'product' }));
                if (p.variations) {
                    try {
                        const variations = JSON.parse(p.variations);
                        variations.forEach(v => {
                            if (v.color) categorySet.add(JSON.stringify({ name: v.color, type: 'color' }));
                            if (v.size) categorySet.add(JSON.stringify({ name: v.size, type: 'size' }));
                        });
                    } catch (e) { console.error("Erro ao parsear variações", p.variations, e); }
                }
            });

            setUniqueBrands(brands);
            setUniqueCategories(Array.from(categorySet).map(item => JSON.parse(item)));
        })
        .catch(err => console.error("Falha ao buscar produtos:", err));
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const lowercasedSearch = searchTerm.toLowerCase();
    const filtered = products.filter(p =>
        !lowercasedSearch ||
        p.name.toLowerCase().includes(lowercasedSearch) ||
        p.brand.toLowerCase().includes(lowercasedSearch) ||
        p.category.toLowerCase().includes(lowercasedSearch)
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  const handleOpenModal = (product = null) => {
    setEditingProduct(product);
    setProductType(product ? product.product_type : 'perfume');
    setIsModalOpen(true);
  };
  
  const handleSave = async (formData) => {
      try {
        if (editingProduct) {
            await apiService(`/products/${editingProduct.id}`, 'PUT', formData);
            notification.show('Produto atualizado com sucesso!');
        } else {
            await apiService('/products', 'POST', formData);
            notification.show('Produto criado com sucesso!');
        }
        fetchProducts();
        setIsModalOpen(false);
      } catch (error) {
          notification.show(`Erro ao salvar produto: ${error.message}`, 'error');
      }
  };

  const handleDelete = (id) => {
      confirmation.show(
          "Tem certeza que deseja deletar este produto?", 
          async () => {
              try {
                await apiService(`/products/${id}`, 'DELETE');
                fetchProducts();
                notification.show('Produto deletado com sucesso.');
              } catch(error) {
                notification.show(`Erro ao deletar produto: ${error.message}`, 'error');
              }
          },
          { requiresAuth: true, confirmText: 'Deletar', confirmColor: 'bg-red-600 hover:bg-red-700' }
      );
  };

  const handleSelectProduct = (productId) => {
    setSelectedProducts(prevSelected => {
        if (prevSelected.includes(productId)) {
            return prevSelected.filter(id => id !== productId);
        } else {
            return [...prevSelected, productId];
        }
    });
  };

  const handleSelectAll = (e) => {
      if (e.target.checked) {
          const allProductIds = filteredProducts.map(p => p.id);
          setSelectedProducts(allProductIds);
      } else {
          setSelectedProducts([]);
      }
  };

  const handleBulkPromotion = async (e) => {
      e.preventDefault();
      if (isBulkLimitedTime && !bulkEndDate) {
          notification.show("Por favor, selecione a data de término da promoção.", "error");
          return;
      }
      
      setIsApplyingBulk(true);
      try {
          const formattedEndDate = isBulkLimitedTime ? new Date(bulkEndDate).toISOString() : null;

          const result = await apiService('/products/bulk-promo', 'PUT', {
              productIds: selectedProducts,
              discountPercentage: bulkDiscount,
              isLimitedTime: isBulkLimitedTime,
              saleEndDate: formattedEndDate
          });
          
          notification.show(result.message);
          fetchProducts();
          setIsBulkPromoModalOpen(false);
          setSelectedProducts([]); 
          setBulkDiscount(10);
          setBulkEndDate('');
          setIsBulkLimitedTime(false);
      } catch (error) {
          notification.show(`Erro ao aplicar promoção: ${error.message}`, 'error');
      } finally {
          setIsApplyingBulk(false);
      }
  };

  // --- NOVA LÓGICA: ENCERRAR PROMOÇÕES APENAS DOS SELECIONADOS ---
  const handleClearSelectedPromotions = () => {
      if (selectedProducts.length === 0) return;

      confirmation.show(
          `Tem certeza que deseja ENCERRAR a promoção de ${selectedProducts.length} produtos selecionados?`,
          async () => {
              setIsClearingPromos(true);
              try {
                  const result = await apiService('/products/bulk-clear-promo', 'PUT', { productIds: selectedProducts });
                  notification.show(result.message);
                  setSearchTerm(''); 
                  setSelectedProducts([]); // Limpa a seleção
                  fetchProducts();
              } catch (error) {
                  notification.show(`Erro ao encerrar promoções: ${error.message}`, 'error');
              } finally {
                  setIsClearingPromos(false);
              }
          },
          { requiresAuth: true, confirmText: 'Encerrar Promoções', confirmColor: 'bg-red-600 hover:bg-red-700' }
      );
  };

  return (
    <div>
        <AnimatePresence>
            {isBulkPromoModalOpen && (
                <Modal isOpen={isBulkPromoModalOpen} onClose={() => setIsBulkPromoModalOpen(false)} title={`Aplicar Promoção em ${selectedProducts.length} Produtos`}>
                    <form onSubmit={handleBulkPromotion} className="space-y-6">
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                            <p className="text-sm text-yellow-800">
                                <strong>Atenção:</strong> Isso atualizará o preço promocional de todos os produtos selecionados baseado no desconto escolhido sobre o preço original atual.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Porcentagem de Desconto (%)</label>
                            <input 
                                type="number" 
                                min="1" 
                                max="99" 
                                value={bulkDiscount} 
                                onChange={(e) => setBulkDiscount(e.target.value)} 
                                className="w-full p-2 border border-gray-300 rounded-md text-lg font-bold text-gray-800"
                            />
                        </div>

                        <div className="flex items-center space-x-3 p-3 border rounded-md">
                            <input 
                                type="checkbox" 
                                id="bulkTimeLimit" 
                                checked={isBulkLimitedTime} 
                                onChange={(e) => setIsBulkLimitedTime(e.target.checked)} 
                                className="h-5 w-5 text-amber-600 rounded"
                            />
                            <label htmlFor="bulkTimeLimit" className="text-gray-800 font-medium cursor-pointer">Definir Tempo Limitado?</label>
                        </div>

                        {isBulkLimitedTime && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                <label className="block text-sm font-bold text-red-600 mb-1">Data/Hora de Término</label>
                                <input 
                                    type="datetime-local" 
                                    value={bulkEndDate} 
                                    onChange={(e) => setBulkEndDate(e.target.value)} 
                                    className="w-full p-2 border border-red-300 rounded-md focus:ring-red-500"
                                    required={isBulkLimitedTime}
                                />
                                <p className="text-xs text-gray-500 mt-1">Os produtos voltarão ao preço original automaticamente após esta data.</p>
                            </motion.div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button type="button" onClick={() => setIsBulkPromoModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
                            <button type="submit" disabled={isApplyingBulk} className="px-6 py-2 bg-amber-500 text-black font-bold rounded-md hover:bg-amber-400 flex items-center gap-2">
                                {isApplyingBulk ? <SpinnerIcon className="h-5 w-5"/> : <SaleIcon className="h-5 w-5"/>}
                                Aplicar Desconto
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {isModalOpen && (
                <Modal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    title={editingProduct ? 'Editar Produto' : 'Adicionar Novo Produto'}
                    size="3xl"
                >
                    <ProductForm
                        item={editingProduct} 
                        onSave={handleSave} 
                        onCancel={() => setIsModalOpen(false)} 
                        productType={productType}
                        setProductType={setProductType}
                        brands={uniqueBrands}
                        categories={uniqueCategories}
                    />
                </Modal>
            )}
        </AnimatePresence>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold">Gerenciar Produtos</h1>
            <div className="flex flex-wrap gap-2">
                
                {/* --- BOTÃO DE AÇÃO EM MASSA (SÓ APARECE SE TIVER SELEÇÃO) --- */}
                {selectedProducts.length > 0 && (
                    <>
                        <button onClick={() => setIsBulkPromoModalOpen(true)} className="bg-amber-500 text-black px-4 py-2 rounded-md hover:bg-amber-400 flex items-center space-x-2 font-bold animate-pulse">
                            <SaleIcon className="h-5 w-5"/> <span>Aplicar Promoção ({selectedProducts.length})</span>
                        </button>
                        
                        <button 
                            onClick={handleClearSelectedPromotions} 
                            disabled={isClearingPromos}
                            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center space-x-2 disabled:opacity-50"
                            title="Remove a promoção apenas dos produtos selecionados"
                        >
                            {isClearingPromos ? <SpinnerIcon className="h-5 w-5"/> : <XMarkIcon className="h-5 w-5"/>}
                            <span>Encerrar ({selectedProducts.length})</span>
                        </button>
                    </>
                )}
                
                {/* O botão "Encerrar Todas" foi removido daqui para atender ao seu pedido */}

                <button onClick={() => handleOpenModal()} className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900 flex items-center space-x-2">
                    <PlusIcon className="h-5 w-5"/> <span>Novo Produto</span>
                </button>
            </div>
        </div>
        
        <div className="mb-6">
            <input 
                type="text" 
                name="search_products_admin_safe" 
                autoComplete="off" 
                placeholder="Pesquisar por nome, marca ou categoria..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
            {/* --- VERSÃO DESKTOP --- */}
            <div className="hidden md:block">
                <table className="w-full text-left">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-4 w-4">
                                <input type="checkbox" onChange={handleSelectAll} checked={filteredProducts.length > 0 && selectedProducts.length === filteredProducts.length} />
                            </th>
                            <th className="p-4">Produto</th>
                            <th className="p-4">Tipo</th>
                            <th className="p-4">Preço</th>
                            <th className="p-4">Promoção</th>
                            <th className="p-4">Estoque</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(p => {
                            const isTimeLimited = p.is_on_sale && p.sale_end_date && new Date(p.sale_end_date).getTime() > new Date().getTime();
                            
                            return (
                                <tr key={p.id} className={`border-b ${selectedProducts.includes(p.id) ? 'bg-amber-50' : ''} ${p.stock < LOW_STOCK_THRESHOLD ? 'bg-red-50' : ''}`}>
                                    <td className="p-4"><input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={() => handleSelectProduct(p.id)} /></td>
                                    <td className="p-4 flex items-center">
                                        <div className="w-10 h-10 mr-4 flex-shrink-0 bg-gray-200 rounded-md flex items-center justify-center">
                                            <img src={getFirstImage(p.images, 'https://placehold.co/40x40/222/fff?text=Img')} className="max-h-full max-w-full object-contain" alt={p.name}/>
                                        </div>
                                        <div>
                                            <p className="font-semibold">{p.name}</p>
                                            <p className="text-xs text-gray-500">{p.brand}</p>
                                        </div>
                                    </td>
                                    <td className="p-4 capitalize">
                                        {p.product_type === 'clothing' ? 'Roupa' : (p.product_type === 'perfume' ? 'Perfume' : p.product_type)}
                                    </td>
                                    <td className="p-4">
                                        {p.is_on_sale && p.sale_price > 0 ? (
                                            <div className="flex flex-col">
                                                <span className="text-red-600 font-bold">R$ {Number(p.sale_price).toFixed(2)}</span>
                                                <span className="text-gray-500 text-xs line-through">R$ {Number(p.price).toFixed(2)}</span>
                                            </div>
                                        ) : (
                                            <span>R$ {Number(p.price).toFixed(2)}</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {p.is_on_sale ? (
                                            <div className="flex flex-col items-start gap-1">
                                                <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Ativa</span>
                                                {isTimeLimited ? (
                                                    <div className="flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                                        <ClockIcon className="h-3 w-3 text-red-500"/>
                                                        <AdminCountdown endDate={p.sale_end_date} />
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-[10px]">Sem data fim</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className={`p-4 font-bold ${p.stock < LOW_STOCK_THRESHOLD ? 'text-red-600' : ''}`}>
                                        {p.stock < LOW_STOCK_THRESHOLD && <ExclamationIcon className="h-4 w-4 inline-block mr-1 text-yellow-500"/>}
                                        {p.stock}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${p.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>{p.is_active ? 'Ativo' : 'Inativo'}</span>
                                    </td>
                                    <td className="p-4 space-x-2"><button onClick={() => handleOpenModal(p)}><EditIcon className="h-5 w-5"/></button><button onClick={() => handleDelete(p.id)}><TrashIcon className="h-5 w-5"/></button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            {/* --- VERSÃO MOBILE DO ADMIN (ATUALIZADA) --- */}
            <div className="md:hidden">
                {/* Cabeçalho Mobile com Selecionar Todos */}
                <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                     <label className="flex items-center gap-3 font-bold text-gray-700">
                        <input type="checkbox" onChange={handleSelectAll} checked={filteredProducts.length > 0 && selectedProducts.length === filteredProducts.length} className="h-5 w-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500" />
                        Selecionar Todos
                     </label>
                     <span className="text-xs text-gray-500">{filteredProducts.length} itens</span>
                </div>

                <div className="space-y-4 p-4">
                    {filteredProducts.map(p => {
                        const isTimeLimited = p.is_on_sale && p.sale_end_date && new Date(p.sale_end_date).getTime() > new Date().getTime();
                        return (
                            <div key={p.id} className={`bg-white border rounded-lg p-4 shadow-sm ${selectedProducts.includes(p.id) ? 'border-amber-400 bg-amber-50' : ''}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center">
                                        <input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={() => handleSelectProduct(p.id)} className="mr-4 h-5 w-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"/>
                                        <img src={getFirstImage(p.images, 'https://placehold.co/40x40/222/fff?text=Img')} className="h-14 w-14 object-contain mr-3 bg-gray-100 rounded"/>
                                        <div>
                                            <p className="font-bold text-gray-900 line-clamp-1">{p.name}</p>
                                            <p className="text-sm text-gray-500">{p.brand}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Badge de Status Mobile - CORREÇÃO DO 0 */}
                                    <div className="flex flex-col items-end gap-1">
                                         <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase ${p.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>{p.is_active ? 'Ativo' : 'Inativo'}</span>
                                         {!!p.is_on_sale && (
                                             <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Promo</span>
                                         )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-4 text-sm border-t pt-4">
                                    <div>
                                        <strong className="text-gray-500 block text-xs uppercase tracking-wide mb-1">Preço</strong> 
                                        {!!p.is_on_sale && p.sale_price > 0 ? (
                                            <div className="flex flex-col">
                                                <span className="text-red-600 font-bold text-lg">R$ {Number(p.sale_price).toFixed(2)}</span>
                                                <span className="text-gray-400 text-xs line-through">R$ {Number(p.price).toFixed(2)}</span>
                                                {isTimeLimited && (
                                                    <div className="flex items-center gap-1 mt-1 bg-red-50 px-1.5 py-0.5 rounded w-fit">
                                                        <ClockIcon className="h-3 w-3 text-red-500"/>
                                                        <AdminCountdown endDate={p.sale_end_date} />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="font-bold text-gray-800">R$ {Number(p.price).toFixed(2)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <strong className="text-gray-500 block text-xs uppercase tracking-wide mb-1">Estoque</strong> 
                                        <div className={`font-bold ${p.stock < LOW_STOCK_THRESHOLD ? 'text-red-600 flex items-center gap-1' : 'text-gray-800'}`}>
                                            {p.stock < LOW_STOCK_THRESHOLD && <ExclamationIcon className="h-4 w-4"/>}
                                            {p.stock} un.
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-2 mt-4 pt-2 border-t">
                                    <button onClick={() => handleOpenModal(p)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 font-medium text-xs"><EditIcon className="h-4 w-4"/> Editar</button>
                                    <button onClick={() => handleDelete(p.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 font-medium text-xs"><TrashIcon className="h-4 w-4"/> Excluir</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    </div>
  )
};
const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const notification = useNotification();

    const fetchUsers = useCallback(() => {
        setIsLoading(true);
        apiService('/users')
            .then(setUsers)
            .catch(err => notification.show(`Erro ao buscar usuários: ${err.message}`, 'error'))
            .finally(() => setIsLoading(false));
    }, [notification]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    
    const handleOpenDetails = (user) => {
        setSelectedUser(user);
        setIsDetailModalOpen(true);
    };

    return (
        <div>
             <AnimatePresence>
                {isDetailModalOpen && (
                    <UserDetailsModal 
                        user={selectedUser} 
                        onClose={() => setIsDetailModalOpen(false)}
                        onUserUpdate={fetchUsers} // Passa a função para recarregar a lista
                    />
                )}
            </AnimatePresence>
            <h1 className="text-3xl font-bold mb-6">Gerenciar Usuários</h1>
            
            {isLoading ? (
                <div className="flex justify-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-500" /></div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-4 font-semibold">Nome</th>
                                    <th className="p-4 font-semibold">Email</th>
                                    <th className="p-4 font-semibold">Função</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className="border-b last:border-b-0 hover:bg-gray-50">
                                        <td className="p-4 font-medium">{u.name}</td>
                                        <td className="p-4 text-gray-600">{u.email}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-800'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {u.status === 'active' ? 'Ativo' : 'Bloqueado'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <button onClick={() => handleOpenDetails(u)} className="p-2 text-gray-500 hover:text-blue-600" title="Ver Detalhes">
                                                <EyeIcon className="h-5 w-5"/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4 p-4">
                        {users.map(u => (
                            <div key={u.id} className="bg-white border rounded-lg p-4 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold">{u.name}</p>
                                        <p className="text-sm text-gray-600">{u.email}</p>
                                    </div>
                                    <button onClick={() => handleOpenDetails(u)} className="p-2 text-gray-500 hover:text-blue-600" title="Ver Detalhes">
                                        <EyeIcon className="h-5 w-5"/>
                                    </button>
                                </div>
                                <div className="flex items-center justify-start gap-4 mt-4 pt-4 border-t">
                                    <div>
                                        <strong className="text-gray-500 block text-xs">Função</strong>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-800'}`}>
                                            {u.role}
                                        </span>
                                    </div>
                                    <div>
                                        <strong className="text-gray-500 block text-xs">Status</strong>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {u.status === 'active' ? 'Ativo' : 'Bloqueado'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const CouponCountdown = ({ createdAt, validityDays }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!validityDays || !createdAt) {
            setTimeLeft('Permanente');
            return;
        }

        const interval = setInterval(() => {
            const expirationDate = new Date(new Date(createdAt).getTime() + validityDays * 24 * 60 * 60 * 1000);
            const now = new Date();
            const difference = expirationDate - now;

            if (difference <= 0) {
                setTimeLeft('Expirado');
                clearInterval(interval);
                return;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((difference / 1000 / 60) % 60);
            const seconds = Math.floor((difference / 1000) % 60);
            
            let displayString = '';
            if (days > 0) displayString += `${days}d `;
            displayString += `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            
            setTimeLeft(displayString);
        }, 1000);

        return () => clearInterval(interval);
    }, [createdAt, validityDays]);

    const colorClass = timeLeft === 'Expirado' ? 'text-red-500' : 'text-green-600';

    return <span className={`font-mono text-sm ${colorClass}`}>{timeLeft}</span>;
};

const AdminCoupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [productsData, setProductsData] = useState({ brands: [], categories: [] });
    const [searchTerm, setSearchTerm] = useState(''); 
    const [selectedCoupons, setSelectedCoupons] = useState([]); 
    const notification = useNotification();
    const confirmation = useConfirmation();

    // Helper robusto para JSON
    const tryParse = (data) => {
        if (Array.isArray(data)) return data;
        try {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    };

    useEffect(() => {
        fetchCoupons();
        
        Promise.all([
            apiService('/products/all'),
            apiService('/collections/admin')
        ]).then(([products, collections]) => {
            const productBrands = products.map(p => p.brand).filter(b => b && b.trim() !== "");
            const productCats = products.map(p => p.category).filter(c => c && c.trim() !== "");
            const collectionCats = collections.map(c => c.filter || c.name).filter(c => c && c.trim() !== "");

            const uniqueBrands = [...new Set(productBrands)].sort();
            const uniqueCategories = [...new Set([...productCats, ...collectionCats])].sort();

            setProductsData({ brands: uniqueBrands, categories: uniqueCategories });
        }).catch(() => {});
    }, []);

    const fetchCoupons = () => {
        apiService('/coupons').then(setCoupons).catch(console.error);
    };

    const filteredCoupons = coupons.filter(coupon => {
        const term = searchTerm.toLowerCase();
        const codeMatch = coupon.code.toLowerCase().includes(term);
        return codeMatch;
    });

    const handleSelectAll = (e) => {
        if (e.target.checked) setSelectedCoupons(filteredCoupons.map(c => c.id));
        else setSelectedCoupons([]);
    };

    const handleSelectCoupon = (id) => {
        setSelectedCoupons(prev => prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]);
    };

    const handleBulkAction = (action) => {
         if (selectedCoupons.length === 0) return;
         const actionText = action === 'delete' ? 'excluir' : (action === 'deactivate' ? 'desativar' : 'ativar');
         confirmation.show(`Confirmar ${actionText} ${selectedCoupons.length} cupom(ns)?`, async () => {
            try {
                const promises = selectedCoupons.map(id => {
                    if (action === 'delete') return apiService(`/coupons/${id}`, 'DELETE');
                    const original = coupons.find(c => c.id === id);
                    if (!original) return Promise.resolve();
                    return apiService(`/coupons/${id}`, 'PUT', { ...original, is_active: action === 'activate' ? 1 : 0 });
                });
                await Promise.all(promises);
                notification.show(`Ação concluída!`);
                setSelectedCoupons([]);
                fetchCoupons();
            } catch (e) { notification.show(e.message, 'error'); }
         });
    };
    
    const handleSave = async (formData) => {
        try {
            const hasRestrictions = (formData.allowed_categories && formData.allowed_categories.length > 0) || 
                                    (formData.allowed_brands && formData.allowed_brands.length > 0);
            
            const payload = {
                ...formData,
                is_global: hasRestrictions ? 0 : (formData.is_global ? 1 : 0),
                allowed_categories: hasRestrictions ? formData.allowed_categories : [],
                allowed_brands: hasRestrictions ? formData.allowed_brands : []
            };

            if (formData.id) {
                await apiService(`/coupons/${formData.id}`, 'PUT', payload);
                notification.show('Atualizado!');
            } else {
                await apiService('/coupons', 'POST', payload);
                notification.show('Criado!');
            }
            fetchCoupons();
            setIsModalOpen(false);
        } catch (error) { notification.show(error.message, 'error'); }
    };

    const handleDelete = (id) => {
        confirmation.show("Excluir este cupom?", async () => {
            try {
                await apiService(`/coupons/${id}`, 'DELETE');
                fetchCoupons();
                notification.show('Excluído.');
            } catch(e) { notification.show(e.message, 'error'); }
        });
    };

    const CouponCountdown = ({ createdAt, validityDays }) => {
        const [timeLeft, setTimeLeft] = useState('');
        useEffect(() => {
            if (!validityDays || Number(validityDays) === 0) { setTimeLeft('Permanente'); return; }
            const calc = () => {
                const exp = new Date(new Date(createdAt).getTime() + Number(validityDays) * 86400000);
                const diff = exp - new Date();
                if (diff <= 0) { setTimeLeft('Expirado'); return; }
                const d = Math.floor(diff / 86400000);
                const h = Math.floor((diff % 86400000) / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
            };
            calc();
            const i = setInterval(calc, 1000);
            return () => clearInterval(i);
        }, [createdAt, validityDays]);
        
        let color = 'text-gray-500';
        if(timeLeft === 'Expirado') color = 'text-red-500 font-bold';
        else if(timeLeft === 'Permanente') color = 'text-green-600 font-bold';
        else color = 'text-amber-600 font-mono';
        return <span className={`text-xs ${color}`}>{timeLeft}</span>;
    };

    const CouponForm = ({ item, onSave, onCancel }) => {
        const [form, setForm] = useState(item || {
            code: '', type: 'percentage', value: '', is_active: 1, is_global: 1,
            allowed_categories: [], allowed_brands: [], validity_days: '',
            is_first_purchase: 0, is_single_use_per_user: 0
        });

        const toggleSelection = (field, value) => {
            setForm(prev => {
                const list = prev[field] || [];
                if (list.includes(value)) {
                    return { ...prev, [field]: list.filter(v => v !== value) };
                } else {
                    return { ...prev, [field]: [...list, value], is_global: 0 };
                }
            });
        };

        return (
            <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold">Código</label>
                        <input type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} className="w-full p-2 border rounded uppercase" required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold">Tipo</label>
                        <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full p-2 border rounded">
                            <option value="percentage">%</option>
                            <option value="fixed">R$</option>
                            <option value="free_shipping">Frete Grátis</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                     {form.type !== 'free_shipping' && (
                        <div>
                            <label className="block text-sm font-bold">Valor</label>
                            <input type="number" value={form.value} onChange={e => setForm({...form, value: e.target.value})} className="w-full p-2 border rounded" required />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-bold">Validade (Dias)</label>
                        <input type="number" value={form.validity_days} onChange={e => setForm({...form, validity_days: e.target.value})} placeholder="Vazio = Eterno" className="w-full p-2 border rounded" />
                    </div>
                </div>

                <div className="border-t pt-4">
                     <label className="flex items-center space-x-2 cursor-pointer mb-2 bg-gray-100 p-2 rounded">
                        <input 
                            type="checkbox" 
                            checked={!!form.is_global} 
                            onChange={e => {
                                const checked = e.target.checked;
                                setForm({...form, is_global: checked ? 1 : 0, allowed_categories: checked ? [] : form.allowed_categories, allowed_brands: checked ? [] : form.allowed_brands});
                            }} 
                        />
                        <span className="font-bold">Cupom Global</span>
                    </label>

                    {(!form.is_global || form.allowed_categories.length > 0 || form.allowed_brands.length > 0) && (
                        <div className="bg-white p-3 border rounded">
                             <p className="text-xs text-red-600 font-bold mb-2">*Restrições (Selecione para ativar):</p>
                             <div className="mb-2">
                                <span className="block text-xs font-bold uppercase">Categorias</span>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                    {productsData.categories.map(cat => (
                                        <button type="button" key={cat} onClick={() => toggleSelection('allowed_categories', cat)} className={`px-2 py-0.5 text-[10px] rounded border ${form.allowed_categories?.includes(cat) ? 'bg-blue-600 text-white' : 'bg-gray-50'}`}>{cat}</button>
                                    ))}
                                </div>
                             </div>
                             <div>
                                <span className="block text-xs font-bold uppercase">Marcas</span>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                    {productsData.brands.map(brand => (
                                        <button type="button" key={brand} onClick={() => toggleSelection('allowed_brands', brand)} className={`px-2 py-0.5 text-[10px] rounded border ${form.allowed_brands?.includes(brand) ? 'bg-purple-600 text-white' : 'bg-gray-50'}`}>{brand}</button>
                                    ))}
                                </div>
                             </div>
                        </div>
                    )}
                </div>
                
                 <div className="border-t pt-2 space-y-2 bg-yellow-50 p-2 rounded">
                     <label className="flex items-center space-x-2"><input type="checkbox" checked={!!form.is_first_purchase} onChange={e => setForm({...form, is_first_purchase: e.target.checked ? 1 : 0})}/> <span className="text-xs">Apenas 1ª Compra</span></label>
                     <label className="flex items-center space-x-2"><input type="checkbox" checked={!!form.is_single_use_per_user} onChange={e => setForm({...form, is_single_use_per_user: e.target.checked ? 1 : 0})}/> <span className="text-xs">Uso Único por Cliente</span></label>
                </div>
                <div className="pt-2"><label className="flex items-center space-x-2"><input type="checkbox" checked={!!form.is_active} onChange={e => setForm({...form, is_active: e.target.checked ? 1 : 0})}/> <span className="font-bold">Ativo</span></label></div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded font-bold">Salvar</button>
                </div>
            </form>
        );
    };

    return (
        <div>
            <AnimatePresence>
                {isModalOpen && <Modal isOpen={true} onClose={() => setIsModalOpen(false)} title={editingCoupon ? 'Editar' : 'Novo'}><CouponForm item={editingCoupon} onSave={handleSave} onCancel={() => setIsModalOpen(false)} /></Modal>}
            </AnimatePresence>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Gerenciar Cupons</h1>
                <button onClick={() => { setEditingCoupon(null); setIsModalOpen(true); }} className="bg-gray-800 text-white px-4 py-2 rounded flex items-center gap-2"><PlusIcon className="h-5 w-5"/> Novo</button>
            </div>
            
            {/* Barra de Pesquisa */}
            <div className="mb-6 relative">
                <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 pl-10 border rounded shadow-sm" />
                <div className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400"><SearchIcon className="h-5 w-5" /></div>
            </div>

            {/* Barra de Ações em Massa (Visível apenas se houver seleção) */}
            <AnimatePresence>
                {selectedCoupons.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-6 flex flex-wrap items-center justify-between gap-3 sticky top-16 z-20 shadow-md"
                    >
                        <div className="text-sm font-bold text-blue-800">
                            {selectedCoupons.length} selecionado(s)
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleBulkAction('activate')} className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700">Ativar</button>
                            <button onClick={() => handleBulkAction('deactivate')} className="px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded hover:bg-yellow-600">Desativar</button>
                            <button onClick={() => handleBulkAction('delete')} className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 flex items-center gap-1"><TrashIcon className="h-3 w-3"/> Excluir</button>
                            <button onClick={() => setSelectedCoupons([])} className="px-2 py-1 bg-white border border-gray-300 text-gray-600 text-xs font-bold rounded hover:bg-gray-100">Cancelar</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Seleção Múltipla Mobile (Apenas Checkbox) */}
            <div className="md:hidden flex items-center mb-4 px-1">
                <input 
                    type="checkbox" 
                    id="mobile-select-all"
                    onChange={handleSelectAll} 
                    checked={filteredCoupons.length > 0 && selectedCoupons.length === filteredCoupons.length}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-5 w-5 mr-2"
                />
                <label htmlFor="mobile-select-all" className="text-sm font-bold text-gray-700">Selecionar Todos</label>
            </div>

            <div className="hidden md:block bg-white rounded shadow overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 w-10"><input type="checkbox" onChange={handleSelectAll} checked={filteredCoupons.length > 0 && selectedCoupons.length === filteredCoupons.length}/></th>
                            <th className="p-3">Código</th><th className="p-3">Regra</th><th className="p-3">Desc.</th><th className="p-3">Restrições</th><th className="p-3">Valid.</th><th className="p-3">Status</th><th className="p-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCoupons.map(c => (
                            <tr key={c.id} className="border-b hover:bg-gray-50">
                                <td className="p-3"><input type="checkbox" checked={selectedCoupons.includes(c.id)} onChange={() => handleSelectCoupon(c.id)}/></td>
                                <td className="p-3 font-mono font-bold text-blue-600">{c.code}</td>
                                <td className="p-3 text-xs">{c.is_global ? <span className="text-green-600 font-bold">Global</span> : <span className="text-amber-600 font-bold">Restrito</span>}</td>
                                <td className="p-3 text-sm">{c.type === 'free_shipping' ? 'Grátis' : (c.type === 'percentage' ? `${c.value}%` : `R$${c.value}`)}</td>
                                <td className="p-3 text-xs text-gray-500">
                                    {!c.is_global && (
                                        <div className="flex flex-col gap-1">
                                            {tryParse(c.allowed_brands).length > 0 && <span className="text-purple-700">M: {tryParse(c.allowed_brands).join(', ')}</span>}
                                            {tryParse(c.allowed_categories).length > 0 && <span className="text-blue-700">C: {tryParse(c.allowed_categories).join(', ')}</span>}
                                        </div>
                                    )}
                                    {!!c.is_first_purchase && <div className="text-amber-700 font-semibold">• 1ª Compra</div>}
                                    {!!c.is_single_use_per_user && <div className="text-blue-700 font-semibold">• Uso Único</div>}
                                </td>
                                <td className="p-3"><CouponCountdown createdAt={c.created_at} validityDays={c.validity_days}/></td>
                                <td className="p-3"><span className={`px-2 py-0.5 text-xs rounded ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100'}`}>{c.is_active ? 'Ativo' : 'Inativo'}</span></td>
                                <td className="p-3 flex gap-2">
                                    <button onClick={() => { setEditingCoupon({ ...c, allowed_categories: tryParse(c.allowed_categories), allowed_brands: tryParse(c.allowed_brands) }); setIsModalOpen(true); }}><EditIcon className="h-4 w-4 text-gray-500"/></button>
                                    <button onClick={() => handleDelete(c.id)}><TrashIcon className="h-4 w-4 text-red-500"/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="md:hidden space-y-3">
                 {filteredCoupons.map(c => (
                    <div key={c.id} className={`bg-white border rounded p-3 relative ${selectedCoupons.includes(c.id) ? 'border-blue-400 ring-1 ring-blue-400' : ''}`}>
                         <div className="flex justify-between">
                            <div><h3 className="font-bold text-blue-700">{c.code}</h3><p className="text-xs">{c.type === 'free_shipping' ? 'Frete Grátis' : `${c.value}${c.type==='percentage'?'%':'R$'}`}</p></div>
                            <input type="checkbox" checked={selectedCoupons.includes(c.id)} onChange={() => handleSelectCoupon(c.id)}/>
                         </div>
                         
                         <div className="flex justify-between mt-2 text-xs text-gray-500 items-center">
                            <span className="bg-gray-100 px-2 py-0.5 rounded">{c.is_global ? 'Global' : 'Restrito'}</span>
                            <span className={`font-bold px-2 py-0.5 rounded ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {c.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                            <CouponCountdown createdAt={c.created_at} validityDays={c.validity_days}/>
                         </div>

                         <div className="text-xs mt-2">
                            {!c.is_global && (
                                <div className="flex flex-col gap-1 text-gray-600 bg-gray-50 p-1 rounded">
                                    {tryParse(c.allowed_brands).length > 0 && <span>M: {tryParse(c.allowed_brands).join(', ')}</span>}
                                    {tryParse(c.allowed_categories).length > 0 && <span>C: {tryParse(c.allowed_categories).join(', ')}</span>}
                                </div>
                            )}
                            {!!c.is_first_purchase && <span className="block text-amber-700 font-semibold">• 1ª Compra</span>}
                            {!!c.is_single_use_per_user && <span className="block text-blue-700 font-semibold">• Uso Único</span>}
                         </div>
                         <div className="flex justify-end gap-3 mt-2 border-t pt-2">
                            <button onClick={() => { setEditingCoupon({ ...c, allowed_categories: tryParse(c.allowed_categories), allowed_brands: tryParse(c.allowed_brands) }); setIsModalOpen(true); }} className="text-blue-600 text-xs font-bold flex gap-1"><EditIcon className="h-3 w-3"/> Edit</button>
                            <button onClick={() => handleDelete(c.id)} className="text-red-600 text-xs font-bold flex gap-1"><TrashIcon className="h-3 w-3"/> Del</button>
                         </div>
                    </div>
                 ))}
            </div>
        </div>
    );
};

const AdminRefunds = ({ onNavigate }) => {
    const [refunds, setRefunds] = useState([]);
    const [filteredRefunds, setFilteredRefunds] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRefund, setSelectedRefund] = useState(null);
    const [isDenyModalOpen, setIsDenyModalOpen] = useState(false);
    const [denyReason, setDenyReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const notification = useNotification();
    const confirmation = useConfirmation();

    const fetchRefunds = useCallback(() => {
        setIsLoading(true);
        apiService('/refunds')
            .then(data => {
                setRefunds(data);
                setFilteredRefunds(data);
            })
            .catch(err => notification.show(`Erro ao buscar reembolsos: ${err.message}`, 'error'))
            .finally(() => setIsLoading(false));
    }, [notification]);

    useEffect(() => {
        fetchRefunds();
    }, [fetchRefunds]);

    const handleApprove = (refund) => {
        confirmation.show(
            `Tem certeza que deseja aprovar e processar o reembolso de R$ ${Number(refund.amount).toFixed(2)} para o pedido #${refund.order_id}? Esta ação é irreversível.`,
            async () => {
                try {
                    const result = await apiService(`/refunds/${refund.id}/approve`, 'POST');
                    notification.show(result.message);
                    fetchRefunds();
                } catch (error) {
                    notification.show(`Erro ao aprovar: ${error.message}`, 'error');
                }
            },
            { requiresAuth: true, confirmText: 'Aprovar e Processar', confirmColor: 'bg-red-600 hover:bg-red-700' }
        );
    };

    const handleDeny = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            const result = await apiService(`/refunds/${selectedRefund.id}/deny`, 'POST', { reason: denyReason });
            notification.show(result.message);
            setIsDenyModalOpen(false);
            setDenyReason('');
            fetchRefunds();
        } catch (error) {
            notification.show(`Erro ao negar: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusChip = (status) => {
        const statuses = {
            'pending_approval': { text: 'Pendente', class: 'bg-yellow-100 text-yellow-800' },
            'approved': { text: 'Aprovado', class: 'bg-blue-100 text-blue-800' },
            'denied': { text: 'Negado', class: 'bg-red-100 text-red-800' },
            'processed': { text: 'Processado', class: 'bg-green-100 text-green-800' },
            'failed': { text: 'Falhou', class: 'bg-gray-200 text-gray-800' }
        };
        const s = statuses[status] || { text: 'Desconhecido', class: 'bg-gray-200 text-gray-800' };
        return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${s.class}`}>{s.text}</span>;
    };
    
    // Função para extrair o método de pagamento
    const getPaymentMethodName = (method, details) => {
        if (method === 'mercadopago') {
            try {
                const parsedDetails = JSON.parse(details);
                if (parsedDetails.method === 'credit_card') return 'Cartão de Crédito';
                if (parsedDetails.method === 'pix') return 'Pix';
                if (parsedDetails.method === 'boleto') return 'Boleto';
            } catch (e) { /* cai para o fallback */ }
        }
        return method?.replace('_', ' ') || 'N/A';
    };

    return (
        <div>
            <AnimatePresence>
                {isDenyModalOpen && selectedRefund && (
                     <Modal isOpen={true} onClose={() => setIsDenyModalOpen(false)} title={`Negar Reembolso #${selectedRefund.id}`}>
                        <form onSubmit={handleDeny}>
                            <label className="block text-sm font-medium text-gray-700">Por favor, informe o motivo da negação (será registrado internamente):</label>
                            <textarea value={denyReason} onChange={e => setDenyReason(e.target.value)} required rows="4" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsDenyModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
                                <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-gray-800 text-white rounded-md flex items-center gap-2 disabled:bg-gray-400">
                                    {isProcessing && <SpinnerIcon className="h-5 w-5" />}
                                    Confirmar Negação
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>

            <h1 className="text-3xl font-bold mb-6">Gerenciar Reembolsos</h1>
            
            {isLoading ? (
                <div className="flex justify-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-500" /></div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-4">Pedido</th>
                                    <th className="p-4">Cliente</th>
                                    <th className="p-4">Data Pedido</th>
                                    <th className="p-4">Pagamento</th>
                                    <th className="p-4">Data Solicitação</th>
                                    <th className="p-4">Valor</th>
                                    <th className="p-4 w-1/4">Motivo</th>
                                    <th className="p-4">Solicitante</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRefunds.map(r => (
                                    <tr key={r.id} className="border-b">
                                        <td className="p-4 font-mono">#{r.order_id}</td>
                                        <td className="p-4">{r.customer_name}</td>
                                        <td className="p-4">{new Date(r.order_date).toLocaleDateString('pt-BR')}</td>
                                        <td className="p-4 capitalize">{getPaymentMethodName(r.payment_method, r.payment_details)}</td>
                                        <td className="p-4">{new Date(r.created_at).toLocaleString('pt-BR')}</td>
                                        <td className="p-4 font-bold">R$ {Number(r.amount).toFixed(2)}</td>
                                        <td className="p-4 text-gray-600 break-words">{r.reason}</td>
                                        <td className="p-4">{r.requester_name}</td>
                                        <td className="p-4">{getStatusChip(r.status)}</td>
                                        <td className="p-4">
                                            {r.status === 'pending_approval' && (
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleApprove(r)} className="p-2 text-green-600 hover:bg-green-100 rounded-full" title="Aprovar"><CheckIcon className="h-5 w-5"/></button>
                                                    <button onClick={() => { setSelectedRefund(r); setIsDenyModalOpen(true); }} className="p-2 text-red-600 hover:bg-red-100 rounded-full" title="Negar"><XMarkIcon className="h-5 w-5"/></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     {/* Mobile Card View */}
                     <div className="md:hidden space-y-4 p-4">
                        {filteredRefunds.map(r => (
                            <div key={r.id} className="bg-white border rounded-lg p-4 shadow-sm text-sm">
                                <div className="flex justify-between items-start mb-3 pb-3 border-b">
                                    <div>
                                        <p className="font-bold">Pedido #{r.order_id}</p>
                                        <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString('pt-BR')}</p>
                                    </div>
                                    {getStatusChip(r.status)}
                                </div>
                                <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-3">
                                    <div><strong className="text-gray-500 block">Cliente</strong> {r.customer_name}</div>
                                    <div><strong className="text-gray-500 block">Valor</strong> <span className="font-bold">R$ {Number(r.amount).toFixed(2)}</span></div>
                                    <div><strong className="text-gray-500 block">Data Pedido</strong> {new Date(r.order_date).toLocaleDateString('pt-BR')}</div>
                                    <div><strong className="text-gray-500 block">Pagamento</strong> <span className="capitalize">{getPaymentMethodName(r.payment_method, r.payment_details)}</span></div>
                                    <div><strong className="text-gray-500 block">Solicitado por</strong> {r.requester_name}</div>
                                </div>
                                <div className="border-t pt-3">
                                    <strong className="text-gray-500 block mb-1">Motivo da Solicitação</strong>
                                    <p className="text-gray-700 break-words">{r.reason}</p>
                                </div>
                                {r.status === 'pending_approval' && (
                                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                                        <button onClick={() => { setSelectedRefund(r); setIsDenyModalOpen(true); }} className="px-3 py-1.5 bg-red-100 text-red-700 font-semibold rounded-md">Negar</button>
                                        <button onClick={() => handleApprove(r)} className="px-3 py-1.5 bg-green-100 text-green-700 font-semibold rounded-md">Aprovar</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [editFormData, setEditFormData] = useState({ status: '', tracking_code: '' });
    const notification = useNotification();

    const [currentPage, setCurrentPage] = useState(1);
    // CORREÇÃO: Variável de estado unificada para busca
    const [searchTerm, setSearchTerm] = useState(''); 
    const [newOrdersCount, setNewOrdersCount] = useState(0);
    const [showNewOrderNotification, setShowNewOrderNotification] = useState(true);
    const [itemsExpanded, setItemsExpanded] = useState(true);

    const ordersPerPage = 10;

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        status: '',
        minPrice: '',
        maxPrice: '',
    });

    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [refundAmount, setRefundAmount] = useState(0);
    const [refundReason, setRefundReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // --- STATUS BASE ---
    const allStatuses = [
        'Pendente', 'Pagamento Aprovado', 'Separando Pedido', 
        'Pronto para Retirada', 'Enviado', 'Saiu para Entrega', 
        'Entregue', 'Pagamento Recusado', 'Cancelado'
    ];

    // --- HELPER VISUAL DE ENVIO ---
    const getShippingDisplay = (method) => {
        const lower = method ? method.toLowerCase() : '';
        if (lower.includes('retirar') || lower.includes('loja')) {
            return { 
                icon: <BoxIcon className="h-4 w-4"/>, 
                label: 'Retirada',
                fullText: 'Retirada na Loja', 
                classes: 'bg-purple-100 text-purple-700 border border-purple-200' 
            };
        }
        if (lower.includes('motoboy') || lower.includes('delivery') || lower.includes('local')) {
            return { 
                icon: <TruckIcon className="h-4 w-4"/>, 
                label: 'Motoboy',
                fullText: 'Entrega Local (Moto)', 
                classes: 'bg-blue-100 text-blue-700 border border-blue-200' 
            };
        }
        return { 
            icon: <TruckIcon className="h-4 w-4"/>, 
            label: 'Correios',
            fullText: method || 'Envio Padrão', 
            classes: 'bg-amber-100 text-amber-700 border border-amber-200' 
        };
    };

    // --- COMPONENTE DE TIMELINE INTERNO ---
    const TimelineDisplay = ({ order }) => {
        const isLocalDelivery = order.shipping_method && (order.shipping_method.toLowerCase().includes('motoboy') || order.shipping_method.toLowerCase().includes('entrega local'));
        const isPickup = order.shipping_method === 'Retirar na loja';
        
        let timelineOrder = [];
        let displayLabels = {};

        if (isLocalDelivery) {
            timelineOrder = ['Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Saiu para Entrega', 'Entregue'];
            displayLabels = { 'Pendente': 'Pendente', 'Pagamento Aprovado': 'Aprovado', 'Separando Pedido': 'Separando', 'Saiu para Entrega': 'Em Rota', 'Entregue': 'Entregue' };
        } else if (isPickup) {
            timelineOrder = ['Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Pronto para Retirada', 'Entregue'];
            displayLabels = { 'Pendente': 'Pendente', 'Pagamento Aprovado': 'Aprovado', 'Separando Pedido': 'Separando', 'Pronto para Retirada': 'Pronto', 'Entregue': 'Retirado' };
        } else { 
            timelineOrder = ['Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Enviado', 'Saiu para Entrega', 'Entregue'];
            displayLabels = { 'Pendente': 'Pendente', 'Pagamento Aprovado': 'Aprovado', 'Separando Pedido': 'Separando', 'Enviado': 'Enviado', 'Saiu para Entrega': 'Saiu p/ Entrega', 'Entregue': 'Entregue' };
        }

        if (['Cancelado', 'Pagamento Recusado', 'Reembolsado'].includes(order.status)) {
            return (
                <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center gap-3 mb-6">
                     <XCircleIcon className="h-6 w-6 text-red-600" />
                     <div className="text-center">
                         <p className="font-bold text-red-800 text-lg uppercase tracking-wide">{order.status}</p>
                         <p className="text-xs text-red-600">O fluxo deste pedido foi interrompido.</p>
                     </div>
                </div>
            );
        }

        const currentStatusIndex = timelineOrder.indexOf(order.status);
        const progressWidth = currentStatusIndex >= 0 
            ? (currentStatusIndex / (timelineOrder.length - 1)) * 100 
            : 0;

        return (
            <div className="w-full py-6 mb-4">
                <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10 rounded-full"></div>
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-green-500 -z-10 rounded-full transition-all duration-500" style={{ width: `${progressWidth}%` }}></div>
                    {timelineOrder.map((statusKey, index) => {
                        const isCompleted = index <= currentStatusIndex;
                        const isCurrent = statusKey === order.status;
                        return (
                            <div key={statusKey} className="flex flex-col items-center group">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10 ${isCompleted ? 'bg-green-500 border-green-500 scale-110' : 'bg-white border-gray-300'}`}>
                                    {isCompleted && <CheckIcon className="h-4 w-4 text-white stroke-2" />}
                                </div>
                                <p className={`absolute -bottom-8 text-[10px] font-bold text-center w-20 transition-colors ${isCurrent ? 'text-green-700' : (isCompleted ? 'text-gray-600' : 'text-gray-400')}`}>
                                    {displayLabels[statusKey]}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // --- FUNÇÃO DE WHATSAPP ---
    const handleManualWhatsAppNotification = () => {
        if (!editingOrder || !editingOrder.user_phone) {
            notification.show("Telefone do cliente não disponível.", "error");
            return;
        }
        const cleanPhone = editingOrder.user_phone.replace(/\D/g, '');
        const text = `Olá ${editingOrder.user_name.split(' ')[0]}! O status do seu pedido #${editingOrder.id} mudou para: *${editFormData.status || editingOrder.status}*. ${editFormData.tracking_code ? `Rastreio: ${editFormData.tracking_code}` : ''}`;
        
        if (cleanPhone.length >= 10) {
            window.open(`https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(text)}`, '_blank');
        } else {
            notification.show("Número inválido.", "error");
        }
    };
    
    const fetchOrders = useCallback(() => {
        apiService('/orders')
            .then(data => {
                const sortedData = data.sort((a,b) => new Date(b.date) - new Date(a.date));
                setOrders(sortedData);
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const recent = sortedData.filter(o => {
                    if (!o || !o.date) return false;
                    const d = new Date(o.date);
                    return !isNaN(d) && d > twentyFourHoursAgo;
                });
                setNewOrdersCount(recent.length);
            })
            .catch(console.error);
    }, []);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);
    
    useEffect(() => {
        let temp = [...orders];

        // CORREÇÃO: Lógica de pesquisa unificada usando searchTerm
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            temp = temp.filter(o => 
                String(o.id).includes(lowerTerm) || 
                (o.user_name && o.user_name.toLowerCase().includes(lowerTerm)) ||
                (o.user_cpf && o.user_cpf.includes(lowerTerm))
            );
        }

        if (filters.status) temp = temp.filter(o => o.status === filters.status);
        if (filters.minPrice) temp = temp.filter(o => Number(o.total) >= Number(filters.minPrice));
        if (filters.maxPrice) temp = temp.filter(o => Number(o.total) <= Number(filters.maxPrice));
        
        if (filters.startDate) {
            const start = new Date(filters.startDate);
            start.setHours(0,0,0,0);
            temp = temp.filter(o => new Date(o.date) >= start);
        }
        if (filters.endDate) {
            const end = new Date(filters.endDate);
            end.setHours(23,59,59,999);
            temp = temp.filter(o => new Date(o.date) <= end);
        }

        setFilteredOrders(temp);
        setCurrentPage(1);
    }, [orders, filters, searchTerm]);

    const handleOpenEditModal = async (order) => {
        try {
            const fullDetails = await apiService(`/orders/${order.id}`);
            setEditingOrder(fullDetails);
            setEditFormData({ status: fullDetails.status, tracking_code: fullDetails.tracking_code || '' });
            setItemsExpanded(true); 
            setIsEditModalOpen(true);
        } catch (e) { notification.show("Erro ao abrir pedido.", "error"); }
    };

    const handleSaveOrder = async (e) => {
        e.preventDefault();
        if (!editingOrder) return;
        try {
            await apiService(`/orders/${editingOrder.id}`, 'PUT', editFormData);
            notification.show('Pedido atualizado!');
            fetchOrders();
            setIsEditModalOpen(false);
        } catch(e) { notification.show(e.message, 'error'); }
    };

    const DetailCard = ({ title, icon: Icon, children, className = "" }) => (
        <div className={`bg-white p-5 rounded-xl border border-gray-200 shadow-sm ${className}`}>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                {Icon && <Icon className="h-4 w-4 text-indigo-500"/>}
                {title}
            </h4>
            <div className="text-sm text-gray-700 space-y-2">
                {children}
            </div>
        </div>
    );

    const indexOfLastOrder = currentPage * ordersPerPage;
    const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
    const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

    const getStatusLabel = (status, order) => {
        const isLocal = editingOrder?.shipping_method?.toLowerCase().includes('motoboy');
        if (isLocal) {
            if (status === 'Saiu para Entrega') return 'Saiu para entrega (Motoboy)';
            if (status === 'Separando Pedido') return 'Preparado p/ envio';
        }
        return status;
    };

    const handleOpenRefundModal = () => {
        if (!editingOrder) return;
        setRefundAmount(editingOrder.total);
        setRefundReason('');
        setIsEditModalOpen(false);
        setIsRefundModalOpen(true);
    };

    const handleRequestRefund = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            if (parseFloat(refundAmount) > parseFloat(editingOrder.total)) {
                throw new Error("O valor do reembolso não pode ser maior que o total do pedido.");
            }
            const result = await apiService('/refunds', 'POST', {
                order_id: editingOrder.id,
                amount: refundAmount,
                reason: refundReason,
            });
            notification.show(result.message);
            setIsRefundModalOpen(false);
            fetchOrders();
        } catch (error) {
            notification.show(`Erro ao solicitar reembolso: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const applyFilters = useCallback(() => { /* Lógica mantida */ }, []);
    
    // CORREÇÃO: Limpar filtros agora usa setSearchTerm corretamente
    const clearFilters = () => {
        setFilters({ startDate: '', endDate: '', status: '', customerName: '', minPrice: '', maxPrice: '' });
        setSearchTerm('');
        setCurrentPage(1);
    }

    const getStatusChipClass = (status) => {
        const lowerStatus = status ? status.toLowerCase() : '';
        if (lowerStatus.includes('entregue')) return 'bg-green-100 text-green-800';
        if (lowerStatus.includes('cancelado') || lowerStatus.includes('recusado') || lowerStatus.includes('reembolsado')) return 'bg-red-100 text-red-800';
        if (lowerStatus.includes('pendente')) return 'bg-yellow-100 text-yellow-800';
        return 'bg-blue-100 text-blue-800';
    };

    // --- RENDERIZAÇÃO DO FORMULÁRIO DE ATUALIZAÇÃO (COMPONENTIZADO) ---
    const renderUpdateOrderForm = () => {
        const isLocalDelivery = editingOrder.shipping_method && (editingOrder.shipping_method.toLowerCase().includes('motoboy') || editingOrder.shipping_method.toLowerCase().includes('entrega local'));
        const isPickup = editingOrder.shipping_method === 'Retirar na loja';
        const canRequestRefund = editingOrder.payment_status === 'approved' && !editingOrder.refund_id && editingOrder.status !== 'Cancelado' && editingOrder.status !== 'Reembolsado';

        let availableStatuses = [];
        if (isLocalDelivery) availableStatuses = ['Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Saiu para Entrega', 'Entregue', 'Cancelado', 'Pagamento Recusado'];
        else if (isPickup) availableStatuses = ['Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Pronto para Retirada', 'Entregue', 'Cancelado', 'Pagamento Recusado'];
        else availableStatuses = ['Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Enviado', 'Saiu para Entrega', 'Entregue', 'Cancelado', 'Pagamento Recusado'];

        if (!availableStatuses.includes(editingOrder.status)) availableStatuses.push(editingOrder.status);

        return (
            <div className="bg-white p-6 rounded-xl shadow-md border border-indigo-100 mt-6 lg:mt-0">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-3">
                    <EditIcon className="h-5 w-5 text-indigo-600"/> Atualizar Status e Entrega
                </h4>
                <form onSubmit={handleSaveOrder} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status do Pedido</label>
                            <select name="status" value={editFormData.status} onChange={handleEditFormChange} className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
                                {availableStatuses.map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
                            </select>
                        </div>
                        {!isPickup && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                    {isLocalDelivery ? "Link de Acompanhamento (Uber/Moto)" : "Código de Rastreio"}
                                </label>
                                <input 
                                    type="text" 
                                    name="tracking_code" 
                                    value={editFormData.tracking_code} 
                                    onChange={handleEditFormChange} 
                                    placeholder={isLocalDelivery ? "Cole o link da viagem aqui" : "Ex: AA123456789BR"}
                                    className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" 
                                />
                                {isLocalDelivery && <p className="text-xs text-gray-500 mt-1">Link para o cliente acompanhar o motoboy.</p>}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex flex-col-reverse md:flex-row justify-between items-center pt-4 border-t border-gray-100 gap-4">
                        <div className="flex flex-wrap gap-3 w-full md:w-auto justify-start">
                            {canRequestRefund ? (
                                <button type="button" onClick={handleOpenRefundModal} className="px-4 py-2.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 font-bold text-sm flex items-center gap-2 transition-colors flex-grow md:flex-grow-0 justify-center">
                                    <CurrencyDollarIcon className="h-5 w-5"/> Reembolso
                                </button>
                            ) : editingOrder.refund_id ? (
                                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200 self-center">Reembolso Solicitado</span>
                            ) : null}

                            {editingOrder.user_phone && (
                                <button 
                                    type="button" 
                                    onClick={handleManualWhatsAppNotification}
                                    className="px-4 py-2.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-bold text-sm flex items-center gap-2 transition-colors flex-grow md:flex-grow-0 justify-center"
                                >
                                    <WhatsappIcon className="h-5 w-5"/> Notificar
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-3 w-full md:w-auto">
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 md:flex-none px-6 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 text-sm transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" className="flex-1 md:flex-none px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md text-sm transition-colors flex items-center justify-center gap-2">
                                <CheckIcon className="h-5 w-5"/> Salvar
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        );
    };

    return (
        <div>
            <AnimatePresence>
                {isRefundModalOpen && editingOrder && (
                    <Modal isOpen={true} onClose={() => setIsRefundModalOpen(false)} title={`Solicitar Reembolso para Pedido #${editingOrder.id}`}>
                        <form onSubmit={handleRequestRefund} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Valor a Reembolsar</label>
                                <input type="number" step="0.01" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} max={editingOrder.total} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                                <p className="text-xs text-gray-500 mt-1">Valor total do pedido: R$ {Number(editingOrder.total).toFixed(2)}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Motivo do Reembolso</label>
                                <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} required rows="4" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsRefundModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
                                <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-amber-600 text-white rounded-md flex items-center gap-2 disabled:bg-amber-300">
                                    {isProcessing && <SpinnerIcon className="h-5 w-5" />}
                                    Enviar Solicitação
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {editingOrder && (() => {
                    // --- VARIÁVEIS DE ESTADO ---
                    const isLocalDelivery = editingOrder.shipping_method && (editingOrder.shipping_method.toLowerCase().includes('motoboy') || editingOrder.shipping_method.toLowerCase().includes('entrega local'));
                    const isPickup = editingOrder.shipping_method === 'Retirar na loja';

                    return (
                        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Pedido #${editingOrder.id}`} size="3xl">
                            <div className="bg-gray-50/50 -m-6 p-4 sm:p-6 pb-24">
                                
                                {/* 1. Timeline */}
                                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium">Realizado em</p>
                                            <p className="text-sm font-bold text-gray-900">{new Date(editingOrder.date).toLocaleString('pt-BR')}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border self-start sm:self-auto ${
                                            editingOrder.status === 'Entregue' ? 'bg-green-50 text-green-700 border-green-200' :
                                            editingOrder.status === 'Cancelado' ? 'bg-red-50 text-red-700 border-red-200' :
                                            'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}>
                                            {editingOrder.status}
                                        </span>
                                    </div>
                                    <TimelineDisplay order={editingOrder} />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* COLUNA DA ESQUERDA: Itens */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                            {/* Header do Accordion */}
                                            <div 
                                                className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center cursor-pointer select-none hover:bg-gray-100 transition-colors"
                                                onClick={() => setItemsExpanded(!itemsExpanded)}
                                            >
                                                <h4 className="font-bold text-gray-700 flex items-center gap-2"><BoxIcon className="h-4 w-4"/> Itens do Pedido</h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-gray-500">{editingOrder.items?.length || 0} itens</span>
                                                    <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${itemsExpanded ? 'rotate-180' : ''}`} />
                                                </div>
                                            </div>

                                            {/* Conteúdo do Accordion */}
                                            <AnimatePresence initial={false}>
                                                {itemsExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                    >
                                                        {/* Lista de Itens com Scroll e Badges */}
                                                        <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                                            {editingOrder.items?.map((item, idx) => {
                                                                let variation = item.variation;
                                                                if (typeof variation === 'string') {
                                                                    try { variation = JSON.parse(variation); } catch(e) {}
                                                                }
                                                                
                                                                // Lógica de Badge baseada na presença de variação
                                                                const isClothing = !!variation;
                                                                const itemTypeLabel = isClothing ? 'ROUPA' : 'PERFUME';
                                                                const itemTypeClass = isClothing ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-purple-100 text-purple-700 border-purple-200';
                                                                
                                                                return (
                                                                <div key={idx} className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-gray-50 transition-colors">
                                                                    <div className="w-12 h-12 rounded-lg border border-gray-200 bg-white flex-shrink-0 p-1">
                                                                        <img src={getFirstImage(item.images)} alt="" className="w-full h-full object-contain"/>
                                                                    </div>
                                                                    <div className="flex-grow">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase ${itemTypeClass}`}>
                                                                                {itemTypeLabel}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-sm font-bold text-gray-800 line-clamp-1">{item.name}</p>
                                                                        {variation && (
                                                                            <div className="flex items-center gap-2 mt-1">
                                                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                                                                    Cor: {variation.color}
                                                                                </span>
                                                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                                                                    Tam: {variation.size}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-right w-full sm:w-auto">
                                                                        <p className="text-xs text-gray-500">{item.quantity} x R$ {Number(item.price).toFixed(2)}</p>
                                                                        <p className="text-sm font-bold text-gray-900">R$ {(item.quantity * item.price).toFixed(2)}</p>
                                                                    </div>
                                                                </div>
                                                            )})}
                                                        </div>
                                                        <div className="bg-gray-50 p-4 border-t border-gray-200 space-y-2">
                                                            <div className="flex justify-between text-xs text-gray-600">
                                                                <span>Subtotal</span>
                                                                <span>R$ {(Number(editingOrder.total) - Number(editingOrder.shipping_cost) + Number(editingOrder.discount_amount)).toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs text-gray-600">
                                                                <span>Frete ({editingOrder.shipping_method})</span>
                                                                <span>R$ {Number(editingOrder.shipping_cost).toFixed(2)}</span>
                                                            </div>
                                                            {Number(editingOrder.discount_amount) > 0 && (
                                                                <div className="flex justify-between text-xs text-green-600 font-medium">
                                                                    <span>Desconto ({editingOrder.coupon_code})</span>
                                                                    <span>- R$ {Number(editingOrder.discount_amount).toFixed(2)}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                                                                <span>Total Geral</span>
                                                                <span>R$ {Number(editingOrder.total).toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        
                                        {/* ATUALIZAR PEDIDO (Visível apenas em Desktop) */}
                                        <div className="hidden lg:block">
                                            {renderUpdateOrderForm()}
                                        </div>
                                    </div>

                                    {/* COLUNA DA DIREITA: Informações */}
                                    <div className="space-y-6">
                                        <DetailCard title="Cliente" icon={UserIcon}>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                                                    {editingOrder.user_name.charAt(0)}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="font-bold text-gray-900 leading-tight truncate">{editingOrder.user_name}</p>
                                                    <p className="text-xs text-gray-500">ID: {editingOrder.user_id}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-2 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 text-right font-semibold text-gray-500">CPF:</div>
                                                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{maskCPF(editingOrder.user_cpf || '---')}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 text-right"><WhatsappIcon className="h-4 w-4 text-green-500 mx-auto"/></div>
                                                    <a href={`https://wa.me/55${editingOrder.user_phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:underline hover:text-green-600">
                                                        {maskPhone(editingOrder.user_phone || '')}
                                                    </a>
                                                </div>
                                                {/* BOTÃO ADICIONADO: CONVERSAR NO WHATSAPP */}
                                                {editingOrder.user_phone && (
                                                    <a 
                                                        href={`https://api.whatsapp.com/send?phone=55${editingOrder.user_phone.replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-3 w-full flex items-center justify-center gap-2 bg-green-500 text-white py-2 rounded-md hover:bg-green-600 font-bold transition-colors shadow-sm"
                                                        title="Abrir conversa no WhatsApp"
                                                    >
                                                        <WhatsappIcon className="h-4 w-4 text-white"/> Conversar no WhatsApp
                                                    </a>
                                                )}
                                            </div>
                                        </DetailCard>

                                        <DetailCard title="Entrega" icon={MapPinIcon}>
                                            {/* --- EXIBIÇÃO EXPLÍCITA DO MÉTODO --- */}
                                            <div className="mb-3 pb-2 border-b border-gray-100">
                                                <span className="text-xs text-gray-500 block">Método Escolhido</span>
                                                <p className="font-bold text-indigo-700 text-sm">{editingOrder.shipping_method || 'Não informado'}</p>
                                            </div>

                                            {isPickup ? (
                                                <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800">
                                                    <strong>Retirada na Loja</strong>
                                                    {editingOrder.pickup_details && (() => {
                                                        try {
                                                            const p = JSON.parse(editingOrder.pickup_details);
                                                            return <p className="mt-1">Retirado por: {p.personName} (CPF: {p.personCpf})</p>
                                                        } catch { return null; }
                                                    })()}
                                                </div>
                                            ) : (
                                                <div className="text-xs space-y-2">
                                                    {(() => {
                                                        try {
                                                            const addr = JSON.parse(editingOrder.shipping_address);
                                                            return (
                                                                <>
                                                                    <div className="flex gap-2">
                                                                        <span className="font-semibold text-gray-500 w-12 flex-shrink-0 text-right">Rua:</span>
                                                                        <span className="text-gray-800 font-medium">{addr.logradouro}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <span className="font-semibold text-gray-500 w-12 flex-shrink-0 text-right">Nº:</span>
                                                                        <span className="text-gray-800">{addr.numero} {addr.complemento ? `(${addr.complemento})` : ''}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <span className="font-semibold text-gray-500 w-12 flex-shrink-0 text-right">Bairro:</span>
                                                                        <span className="text-gray-800">{addr.bairro}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <span className="font-semibold text-gray-500 w-12 flex-shrink-0 text-right">Cidade:</span>
                                                                        <span className="text-gray-800">{addr.localidade}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <span className="font-semibold text-gray-500 w-12 flex-shrink-0 text-right">Estado:</span>
                                                                        <span className="text-gray-800">{addr.uf}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <span className="font-semibold text-gray-500 w-12 flex-shrink-0 text-right">CEP:</span>
                                                                        <span className="font-mono text-gray-800 bg-gray-100 px-1 rounded">{addr.cep}</span>
                                                                    </div>
                                                                </>
                                                            );
                                                        } catch { return <p>Endereço inválido</p>; }
                                                    })()}
                                                </div>
                                            )}
                                        </DetailCard>

                                        <DetailCard title="Pagamento" icon={CreditCardIcon}>
                                            <div className="flex flex-col gap-2">
                                                {(() => {
                                                    let details = {};
                                                    try { 
                                                        const parsed = JSON.parse(editingOrder.payment_details); 
                                                        if (parsed && typeof parsed === 'object') details = parsed; 
                                                    } catch {}
                                                    
                                                    return (
                                                        <>
                                                            <span className="inline-flex items-center w-fit px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                                                {details.method === 'pix' ? 'Pix' : details.method === 'boleto' ? 'Boleto' : details.method === 'credit_card' ? 'Cartão' : 'Outro'}
                                                            </span>
                                                            {details.method === 'credit_card' && (
                                                                <div className="text-xs text-gray-600">
                                                                    <p className="capitalize">{details.card_brand} •••• {details.card_last_four}</p>
                                                                    <p>{details.installments}x de R$ {(Number(editingOrder.total)/details.installments).toFixed(2)}</p>
                                                                </div>
                                                            )}
                                                            <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
                                                                <span className="text-xs text-gray-500">Status</span>
                                                                <span className={`text-xs font-bold ${editingOrder.payment_status === 'approved' ? 'text-green-600' : 'text-amber-600'}`}>
                                                                    {editingOrder.payment_status === 'approved' ? 'Aprovado' : 'Pendente'}
                                                                </span>
                                                            </div>
                                                        </>
                                                    )
                                                })()}
                                            </div>
                                        </DetailCard>
                                    </div>
                                </div>
                                
                                {/* ATUALIZAR PEDIDO (Visível apenas em Mobile - FINAL DO FORMULÁRIO) */}
                                <div className="lg:hidden mt-6">
                                    {renderUpdateOrderForm()}
                                </div>

                            </div>
                        </Modal>
                    );
                })()}
            </AnimatePresence>
            
            <AnimatePresence>
                {newOrdersCount > 0 && showNewOrderNotification && (
                    <motion.div 
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="relative bg-blue-600 text-white p-4 rounded-lg shadow-lg mb-6 flex justify-between items-center"
                    >
                        <div className="flex items-center gap-3">
                            <CheckCircleIcon className="h-6 w-6"/>
                            <span className="font-semibold">
                                Você tem {newOrdersCount} novo(s) pedido(s) nas últimas 24 horas!
                            </span>
                        </div>
                        <button onClick={() => setShowNewOrderNotification(false)} className="p-1 rounded-full hover:bg-blue-500">
                            <XMarkIcon className="h-5 w-5"/>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <h1 className="text-3xl font-bold mb-6">Gerenciar Pedidos</h1>
            {/* ... Filtros ... */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-6 space-y-4">
                <h2 className="text-xl font-semibold">Pesquisa Avançada</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <input type="text" name="orderIdSearch" placeholder="Pesquisar por ID, Nome ou CPF..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="p-2 border rounded-md col-span-1 md:col-span-2 lg:col-span-4"/>
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="p-2 border rounded-md" title="Data de Início"/>
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="p-2 border rounded-md" title="Data Final"/>
                    <input type="number" name="minPrice" placeholder="Preço Mín." value={filters.minPrice} onChange={handleFilterChange} className="p-2 border rounded-md"/>
                    <input type="number" name="maxPrice" placeholder="Preço Máx." value={filters.maxPrice} onChange={handleFilterChange} className="p-2 border rounded-md"/>
                    <input type="text" name="customerName" placeholder="Nome do Cliente" value={filters.customerName} onChange={handleFilterChange} className="p-2 border rounded-md md:col-span-2"/>
                    <select name="status" value={filters.status} onChange={handleFilterChange} className="p-2 border rounded-md bg-white">
                        <option value="">Todos os Status</option>
                        {[...new Set(allStatuses)].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="mt-4 flex gap-2 flex-wrap">
                    <button onClick={applyFilters} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Aplicar Filtros</button>
                    <button onClick={clearFilters} className="bg-gray-400 text-white px-4 py-2 rounded-md hover:bg-gray-500">Limpar Filtros</button>
                </div>
            </div>
            
            {/* Tabela de Listagem de Pedidos */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="hidden lg:block overflow-x-auto">
                     <table className="w-full text-left">
                         <thead className="bg-gray-100">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600">ID</th>
                                <th className="p-4 font-semibold text-gray-600">Cliente</th>
                                <th className="p-4 font-semibold text-gray-600">Contato</th>
                                <th className="p-4 font-semibold text-gray-600">Envio</th>
                                <th className="p-4 font-semibold text-gray-600">Total</th>
                                <th className="p-4 font-semibold text-gray-600">Status</th>
                                <th className="p-4 font-semibold text-gray-600">Ações</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                            {currentOrders.map(o => {
                                const shipInfo = getShippingDisplay(o.shipping_method);
                                return (
                                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded">#{o.id}</span>
                                        <p className="text-xs text-gray-400 mt-1">{new Date(o.date).toLocaleDateString('pt-BR')}</p>
                                    </td>
                                    <td className="p-4">
                                        <p className="font-bold text-gray-900">{o.user_name}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                            <UserIcon className="h-3 w-3"/> {maskCPF(o.user_cpf || '')}
                                        </p>
                                    </td>
                                    <td className="p-4">
                                        {o.user_phone ? (
                                            <a href={`https://wa.me/55${o.user_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-green-600 font-bold hover:underline text-sm bg-green-50 px-2 py-1 rounded w-fit">
                                                <WhatsappIcon className="h-4 w-4"/> {maskPhone(o.user_phone)}
                                            </a>
                                        ) : <span className="text-gray-400 text-xs">Sem contato</span>}
                                    </td>
                                    <td className="p-4">
                                        <div className={`flex items-center gap-2 px-2 py-1 rounded-md w-fit ${shipInfo.classes}`}>
                                            {shipInfo.icon}
                                            <span className="text-xs font-bold">{shipInfo.label}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 font-bold text-gray-800">R$ {Number(o.total).toFixed(2)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusChipClass(o.status)}`}>{o.status}</span>
                                    </td>
                                    <td className="p-4">
                                        <button onClick={() => handleOpenEditModal(o)} className="text-gray-500 hover:text-indigo-600 transition-colors p-2 rounded-full hover:bg-indigo-50" title="Ver Detalhes">
                                            <EyeIcon className="h-5 w-5"/>
                                        </button>
                                    </td>
                                </tr>
                            )})}
                         </tbody>
                     </table>
                </div>
                
                {/* Mobile List View (Cards Melhorados) */}
                <div className="lg:hidden space-y-4 p-4 bg-gray-50">
                    {currentOrders.map(o => {
                        const shipInfo = getShippingDisplay(o.shipping_method);
                        return (
                        <div key={o.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                            {/* Faixa lateral de status */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${o.status === 'Entregue' ? 'bg-green-500' : (o.status === 'Cancelado' ? 'bg-red-500' : 'bg-indigo-500')}`}></div>
                            
                            <div className="pl-3">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-indigo-700 text-lg">#{o.id}</span>
                                            <span className="text-xs text-gray-400">{new Date(o.date).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                        <p className="font-bold text-gray-800 text-sm">{o.user_name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900">R$ {Number(o.total).toFixed(2)}</p>
                                        <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${getStatusChipClass(o.status)}`}>{o.status}</span>
                                    </div>
                                </div>

                                {/* Dados do Cliente (Mobile) */}
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100 mb-3">
                                    <div className="flex items-center gap-1.5">
                                        <UserIcon className="h-3.5 w-3.5 text-gray-400"/>
                                        <span className="font-mono">{maskCPF(o.user_cpf || '---')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <WhatsappIcon className="h-3.5 w-3.5 text-green-500"/>
                                        <span className="font-bold text-green-700">{maskPhone(o.user_phone || '---')}</span>
                                    </div>
                                </div>

                                {/* Dados de Envio (Mobile) */}
                                <div className={`flex items-center gap-2 p-2 rounded-lg mb-3 ${shipInfo.classes}`}>
                                    {shipInfo.icon}
                                    <span className="text-xs font-bold">{shipInfo.fullText}</span>
                                </div>

                                <button onClick={() => handleOpenEditModal(o)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md active:scale-95">
                                    <EyeIcon className="h-4 w-4"/> Ver Detalhes do Pedido
                                </button>
                            </div>
                        </div>
                    )})}
                </div>
            </div>
            
            {/* Paginação */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 bg-white border rounded-md disabled:opacity-50 font-bold text-gray-700">Anterior</button>
                    <span className="text-sm font-medium text-gray-600">Página {currentPage} de {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border rounded-md disabled:opacity-50 font-bold text-gray-700">Próxima</button>
                </div>
            )}
        </div>
    );
};
const AdminReports = () => {
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedRows, setExpandedRows] = useState([]); // Para controlar quais linhas da tabela estão expandidas
    const notification = useNotification();
    
    // Define as datas padrão
    const getFirstDayOfMonth = () => {
        const date = new Date();
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        return date.toISOString().split('T')[0];
    };
    const getToday = () => {
        return new Date().toISOString().split('T')[0];
    };

    const [startDate, setStartDate] = useState(getFirstDayOfMonth());
    const [endDate, setEndDate] = useState(getToday());

    const toggleRow = (orderId) => {
        setExpandedRows(prev => 
            prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
        );
    };

    // Função para buscar os dados da API
    const handleGenerateReport = useCallback(() => {
        setIsLoading(true);
        setReportData(null); 
        setExpandedRows([]); // Reseta expansão
        
        if (window.mySalesOverTimeChart) window.mySalesOverTimeChart.destroy();
        if (window.myTopProductsChart) window.myTopProductsChart.destroy();

        apiService(`/reports/detailed?startDate=${startDate}&endDate=${endDate}`)
            .then(data => {
                setReportData(data);
            })
            .catch(err => {
                notification.show(`Erro ao gerar relatório: ${err.message}`, 'error');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [startDate, endDate, notification]);

    useEffect(() => {
        handleGenerateReport();
    }, [handleGenerateReport]); 

    useEffect(() => {
        if (reportData && !isLoading) {
            const renderCharts = () => {
                if (window.Chart) {
                    const salesCtx = document.getElementById('salesOverTimeChart')?.getContext('2d');
                    if (salesCtx && reportData.salesOverTime) {
                        if (window.mySalesOverTimeChart) window.mySalesOverTimeChart.destroy();
                        
                        const safeLabels = reportData.salesOverTime.map(d => {
                            if (!d.sale_date) return "Data Inválida";
                            const dateObj = new Date(d.sale_date); 
                            if (isNaN(dateObj.getTime())) return "Data Inválida";
                            return dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                        });

                        window.mySalesOverTimeChart = new window.Chart(salesCtx, {
                            type: 'line',
                            data: {
                                labels: safeLabels, 
                                datasets: [{
                                    label: 'Faturamento (R$)',
                                    data: reportData.salesOverTime.map(d => d.daily_total),
                                    borderColor: 'rgba(212, 175, 55, 1)',
                                    backgroundColor: 'rgba(212, 175, 55, 0.2)',
                                    fill: true, tension: 0.3
                                }]
                            },
                            options: { responsive: true, maintainAspectRatio: false }
                        });
                    }
                    
                    const productsCtx = document.getElementById('topProductsChart')?.getContext('2d');
                    if (productsCtx && reportData.topProducts) {
                        if (window.myTopProductsChart) window.myTopProductsChart.destroy();
                        window.myTopProductsChart = new window.Chart(productsCtx, {
                            type: 'bar',
                            data: {
                                labels: reportData.topProducts.map(p => p.name),
                                datasets: [{
                                    label: 'Unidades Vendidas',
                                    data: reportData.topProducts.map(p => p.total_quantity),
                                    backgroundColor: 'rgba(212, 175, 55, 0.8)',
                                    borderWidth: 1
                                }]
                            },
                            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
                        });
                    }
                } else {
                    setTimeout(renderCharts, 100);
                }
            };
            renderCharts();
        }
    }, [reportData, isLoading]);

    const StatCard = ({ title, value }) => (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <h4 className="text-sm font-semibold text-gray-500 uppercase">{title}</h4>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
    );

    const runWhenLibsReady = (callback, requiredLibs) => {
        const check = () => {
            const isPdfReady = requiredLibs.includes('pdf') ? (window.jspdf && window.jspdf.jsPDF && typeof window.jspdf.jsPDF.API.autoTable === 'function') : true;
            const isExcelReady = requiredLibs.includes('excel') ? (window.XLSX) : true;
            if (isPdfReady && isExcelReady) callback();
            else setTimeout(check, 100);
        }; check();
    };

    const handleExportPDF = () => {
        if (!reportData) {
            notification.show("Não há dados para exportar.", "error");
            return;
        }

        runWhenLibsReady(() => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const timestamp = new Date().toLocaleString('pt-BR');
            const kpis = reportData.kpis;
            const formattedStartDate = new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR');
            const formattedEndDate = new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR');

            // Título
            doc.setFontSize(18);
            doc.text("Relatório Detalhado de Vendas", pageWidth / 2, 16, { align: 'center' });
            doc.setFontSize(10);
            doc.text(`Período: ${formattedStartDate} a ${formattedEndDate}`, pageWidth / 2, 22, { align: 'center' });
            doc.setFontSize(8);
            doc.text(`Gerado em: ${timestamp}`, pageWidth - 14, 10, { align: 'right' });

            // KPIs
            doc.setFontSize(12);
            doc.text("Resumo do Período", 14, 35);
            doc.autoTable({
                startY: 40,
                head: [['Indicador', 'Valor']],
                body: [
                    ['Faturamento Total', `R$ ${Number(kpis.totalRevenue).toFixed(2)}`],
                    ['Total de Vendas', kpis.totalSales],
                    ['Ticket Médio', `R$ ${Number(kpis.avgOrderValue).toFixed(2)}`],
                    ['Novos Clientes', kpis.newCustomers],
                ],
                theme: 'striped'
            });
            let lastY = doc.lastAutoTable.finalY + 10;

            // Detalhamento de Vendas
            if (reportData.detailedSales && reportData.detailedSales.length > 0) {
                doc.setFontSize(12);
                doc.text("Detalhamento de Vendas e Itens", 14, lastY);
                
                const tableBody = [];
                reportData.detailedSales.forEach(order => {
                    tableBody.push([
                        `#${order.id}`, 
                        order.customer_name, 
                        new Date(order.date).toLocaleDateString(), 
                        `R$ ${Number(order.total).toFixed(2)}`,
                        order.status
                    ]);
                    
                    const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
                    items.forEach(item => {
                        tableBody.push([
                            '', 
                            `-> ${item.quantity}x ${item.name}`, 
                            '', 
                            `R$ ${Number(item.price).toFixed(2)} un.`, 
                            ''
                        ]);
                    });
                });

                doc.autoTable({
                    startY: lastY + 5,
                    head: [['ID', 'Cliente / Produto', 'Data', 'Valor', 'Status']],
                    body: tableBody,
                    theme: 'grid',
                    styles: { fontSize: 8 },
                    columnStyles: {
                        0: { fontStyle: 'bold', cellWidth: 20 },
                        1: { cellWidth: 'auto' },
                        2: { cellWidth: 25 },
                        3: { halign: 'right', cellWidth: 30 },
                        4: { cellWidth: 30 }
                    },
                    didParseCell: function(data) {
                        if (data.section === 'body' && data.row.raw[0] === '') {
                            data.cell.styles.textColor = [100, 100, 100];
                            data.cell.styles.fontStyle = 'italic';
                            data.cell.styles.fillColor = [250, 250, 250];
                        }
                        if (data.section === 'body' && data.row.raw[0] !== '') {
                            data.cell.styles.fillColor = [240, 240, 240];
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                });
                lastY = doc.lastAutoTable.finalY + 10;
            }

            doc.addPage();
            lastY = 20;
            doc.setFontSize(12);
            doc.text("Top Produtos", 14, lastY);
            doc.autoTable({
                startY: lastY + 5,
                head: [['Produto', 'Unidades Vendidas', 'Faturamento (R$)']],
                body: reportData.topProducts.map(p => [
                    p.name,
                    p.total_quantity,
                    `R$ ${Number(p.total_revenue).toFixed(2)}`
                ]),
                theme: 'striped'
            });

            doc.save(`relatorio_detalhado_${startDate}_a_${endDate}.pdf`);
        }, ['pdf']);
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Relatórios Detalhados</h1>
            
            {/* Seletor de Data */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Data de Início</label>
                        <input
                            type="date"
                            id="startDate"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="mt-1 p-2 border border-gray-300 rounded-md w-full md:w-auto"
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Data Final</label>
                        <input
                            type="date"
                            id="endDate"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="mt-1 p-2 border border-gray-300 rounded-md w-full md:w-auto"
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto mt-3 md:mt-6">
                        <button
                            onClick={handleGenerateReport}
                            disabled={isLoading}
                            className="flex-1 md:flex-none bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-900 disabled:bg-gray-400"
                        >
                            {isLoading ? <SpinnerIcon /> : 'Gerar Relatório'}
                        </button>
                        <button
                            onClick={handleExportPDF}
                            disabled={isLoading || !reportData}
                            className="flex-1 md:flex-none bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                        >
                            <DownloadIcon className="h-5 w-5"/>
                            <span className="hidden md:inline">Exportar PDF</span>
                            <span className="md:hidden">PDF</span>
                        </button>
                    </div>
                </div>
            </div>

            {isLoading && (
                <div className="flex justify-center items-center py-20"><SpinnerIcon className="h-10 w-10 text-amber-500" /></div>
            )}

            {reportData && !isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-6"
                >
                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Faturamento Total" value={`R$ ${Number(reportData.kpis.totalRevenue).toFixed(2)}`} />
                        <StatCard title="Total de Vendas" value={reportData.kpis.totalSales} />
                        <StatCard title="Ticket Médio" value={`R$ ${Number(reportData.kpis.avgOrderValue).toFixed(2)}`} />
                        <StatCard title="Novos Clientes" value={reportData.kpis.newCustomers} />
                    </div>

                    {/* NOVA SEÇÃO: DETALHAMENTO DE VENDAS */}
                    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800">Detalhamento de Vendas ({reportData.detailedSales ? reportData.detailedSales.length : 0})</h3>
                        </div>
                        {reportData.detailedSales && reportData.detailedSales.length > 0 ? (
                            <>
                                {/* VISÃO DESKTOP (TABELA) */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-100 text-gray-600 font-semibold uppercase text-xs">
                                            <tr>
                                                <th className="p-4 w-10"></th>
                                                <th className="p-4">Pedido</th>
                                                <th className="p-4">Cliente</th>
                                                <th className="p-4">Data</th>
                                                <th className="p-4">Total</th>
                                                <th className="p-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {reportData.detailedSales.map(order => {
                                                const isExpanded = expandedRows.includes(order.id);
                                                const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);

                                                return (
                                                    <React.Fragment key={order.id}>
                                                        <tr className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50' : ''}`} onClick={() => toggleRow(order.id)}>
                                                            <td className="p-4 text-center">
                                                                <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                                                            </td>
                                                            <td className="p-4 font-bold text-indigo-600">#{order.id}</td>
                                                            <td className="p-4">{order.customer_name}</td>
                                                            <td className="p-4 text-gray-500">{new Date(order.date).toLocaleDateString()}</td>
                                                            <td className="p-4 font-bold text-green-600">R$ {Number(order.total).toFixed(2)}</td>
                                                            <td className="p-4">
                                                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                                                                    {order.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <tr className="bg-gray-50">
                                                                <td colSpan="6" className="p-4 pl-12 border-t border-gray-200 shadow-inner">
                                                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Itens do Pedido:</h4>
                                                                    <div className="space-y-2">
                                                                        {items.map((item, idx) => (
                                                                            <div key={idx} className="flex justify-between text-sm text-gray-700 border-b border-gray-200 pb-1 last:border-0 last:pb-0">
                                                                                <span>{item.quantity}x {item.name}</span>
                                                                                <span className="font-mono">R$ {Number(item.price).toFixed(2)}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* VISÃO MOBILE (CARDS) */}
                                <div className="md:hidden space-y-4 p-4">
                                    {reportData.detailedSales.map(order => {
                                        const isExpanded = expandedRows.includes(order.id);
                                        const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);

                                        return (
                                            <div key={order.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                                                <div 
                                                    className={`p-4 flex justify-between items-start cursor-pointer ${isExpanded ? 'bg-blue-50 border-b border-blue-100' : ''}`}
                                                    onClick={() => toggleRow(order.id)}
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-indigo-600">#{order.id}</span>
                                                            <span className="text-xs text-gray-500">{new Date(order.date).toLocaleDateString()}</span>
                                                        </div>
                                                        <p className="font-medium text-gray-800">{order.customer_name}</p>
                                                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                                            {order.status}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-green-600 mb-2">R$ {Number(order.total).toFixed(2)}</p>
                                                        <ChevronDownIcon className={`h-5 w-5 text-gray-400 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                                                    </div>
                                                </div>
                                                
                                                {/* Detalhes Mobile Expandidos */}
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div 
                                                            initial={{ height: 0 }} 
                                                            animate={{ height: 'auto' }} 
                                                            exit={{ height: 0 }} 
                                                            className="overflow-hidden bg-gray-50"
                                                        >
                                                            <div className="p-4 border-t border-gray-100">
                                                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1">
                                                                    <BoxIcon className="h-3 w-3"/> Itens do Pedido
                                                                </h4>
                                                                <div className="space-y-3">
                                                                    {items.map((item, idx) => (
                                                                        <div key={idx} className="flex justify-between text-sm text-gray-700 border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                                                                            <div className="flex-1 pr-2">
                                                                                <span className="font-bold text-gray-900">{item.quantity}x</span> {item.name}
                                                                            </div>
                                                                            <span className="font-mono text-gray-600 whitespace-nowrap">R$ {Number(item.price).toFixed(2)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="p-8 text-center text-gray-500">Nenhuma venda encontrada neste período.</div>
                        )}
                    </div>

                    {/* Gráficos */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow min-h-[300px]">
                            <h3 className="font-bold mb-4 text-lg">Vendas ao Longo do Tempo</h3>
                            <div className="relative h-64">
                                <canvas id="salesOverTimeChart"></canvas>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow min-h-[300px]">
                            <h3 className="font-bold mb-4 text-lg">Produtos Mais Vendidos (por Unidade)</h3>
                            <div className="relative h-64">
                                <canvas id="topProductsChart"></canvas>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

const AdminLogsPage = () => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const notification = useNotification();

    useEffect(() => {
        apiService('/admin-logs')
            .then(data => {
                if(Array.isArray(data)) {
                    setLogs(data);
                } else {
                    setLogs([]);
                    notification.show('A resposta da API de logs é inválida.', 'error');
                }
            })
            .catch(err => notification.show(`Erro ao buscar logs: ${err.message}`, 'error'))
            .finally(() => setIsLoading(false));
    }, [notification]);

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Histórico de Ações e Auditoria</h1>
            {isLoading ? (
                <div className="flex justify-center items-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-500"/></div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-4 font-semibold">Data</th>
                                    <th className="p-4 font-semibold">Administrador</th>
                                    <th className="p-4 font-semibold">IP</th> {/* Nova Coluna */}
                                    <th className="p-4 font-semibold">Ação</th>
                                    <th className="p-4 font-semibold">Detalhes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4 whitespace-nowrap text-gray-600">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                                        <td className="p-4 font-medium">{log.user_name}</td>
                                        <td className="p-4 font-mono text-xs text-gray-500">{log.ip_address || 'N/A'}</td> {/* Exibição do IP */}
                                        <td className="p-4"><span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full capitalize">{log.action.replace(/_/g, ' ')}</span></td>
                                        <td className="p-4 text-gray-700 break-words">{log.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4 p-4">
                        {logs.map(log => (
                            <div key={log.id} className="bg-white border rounded-lg p-4 shadow-sm text-sm">
                                <div className="flex justify-between items-start mb-3 pb-3 border-b">
                                    <div>
                                        <p className="font-bold">{log.user_name}</p>
                                        <p className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString('pt-BR')}</p>
                                    </div>
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full capitalize">{log.action.replace(/_/g, ' ')}</span>
                                </div>
                                <div className="mb-2">
                                    <span className="text-xs font-bold text-gray-500 uppercase">IP:</span> <span className="font-mono text-xs">{log.ip_address || 'N/A'}</span>
                                </div>
                                <div>
                                    <p className="text-gray-700 break-words">{log.details}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const MaintenancePage = () => {
    return (
        <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center p-4">
            <div className="text-center p-8 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 max-w-md w-full">
                <AdminIcon className="h-16 w-16 text-amber-400 mx-auto mb-6 animate-spin-slow" />
                <h1 className="text-3xl sm:text-4xl font-bold text-amber-400 mb-3">Site em Manutenção</h1>
                <p className="text-gray-300 text-lg">Estamos realizando melhorias para te atender melhor.</p>
                <p className="text-gray-400 mt-2">Voltamos em breve!</p>
            </div>
        </div>
    );
};

const MaintenanceModeToggle = () => {
    const [isOn, setIsOn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const notification = useNotification();

    const fetchStatus = useCallback(() => {
        apiService('/settings/maintenance')
            .then(data => setIsOn(data.status === 'on'))
            .catch(err => notification.show(`Erro ao buscar status: ${err.message}`, 'error'))
            .finally(() => setIsLoading(false));
    }, [notification]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const handleToggle = async () => {
        const newStatus = !isOn;
        setIsLoading(true);
        try {
            await apiService('/settings/maintenance', 'PUT', { status: newStatus ? 'on' : 'off' });
            setIsOn(newStatus);
            notification.show(`Modo de manutenção foi ${newStatus ? 'ATIVADO' : 'DESATIVADO'}.`);
        } catch (error) {
            notification.show(`Erro ao alterar status: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const spring = { type: "spring", stiffness: 700, damping: 30 };

    return (
        <div className={`bg-white p-6 rounded-lg shadow ${isOn ? 'border-l-4 border-red-500' : ''}`}>
            <h3 className="font-bold text-lg mb-3">Modo de Manutenção</h3>
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 max-w-xs">
                    {isOn 
                        ? "O site está em manutenção. Apenas administradores logados podem acessar." 
                        : "O site está online e acessível para todos os usuários."
                    }
                </p>
                {isLoading ? (
                    <SpinnerIcon className="h-6 w-6 text-gray-400"/>
                ) : (
                    <div 
                        className={`flex items-center w-14 h-8 rounded-full p-1 cursor-pointer transition-colors ${isOn ? 'bg-red-500 justify-end' : 'bg-gray-300 justify-start'}`}
                        onClick={handleToggle}
                    >
                        <motion.div 
                            className="w-6 h-6 bg-white rounded-full shadow-md" 
                            layout 
                            transition={spring} 
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

const BannerForm = ({ item, section, onSave, onCancel }) => {
    const [formData, setFormData] = useState(item);
    const [uploading, setUploading] = useState({ desktop: false, mobile: false });
    const desktopInputRef = useRef(null);
    const mobileInputRef = useRef(null);
    const notification = useNotification();

    // Garante atualização se o item mudar (ex: ao clicar num template)
    useEffect(() => {
        setFormData(item);
    }, [item]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
        }));
    };

    const handleFileChange = async (event, type) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploading(prev => ({ ...prev, [type]: true }));
        try {
            const uploadResult = await apiImageUploadService('/upload/image', file);
            const fieldName = type === 'desktop' ? 'image_url' : 'image_url_mobile';
            setFormData(prev => ({ ...prev, [fieldName]: uploadResult.imageUrl }));
            notification.show(`Upload concluído!`);
        } catch (error) {
            notification.show(`Erro no upload: ${error.message}`, 'error');
        } finally {
            setUploading(prev => ({ ...prev, [type]: false }));
            event.target.value = '';
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const getHints = () => {
        switch(section) {
            case 'promo': return { title: "Destaque Agendável (Meio)", sizeDesktop: "1920 x 600 px", showMobile: false, showSchedule: true };
            case 'cards': return { title: "Card de Categoria (Inferior)", sizeDesktop: "600 x 800 px", showMobile: false, showSchedule: false };
            default: return { title: "Banner Rotativo (Topo)", sizeDesktop: "1920 x 720 px", showMobile: true, showSchedule: false };
        }
    };

    const hints = getHints();

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                <h3 className="font-bold text-gray-800">{hints.title}</h3>
                <p className="text-sm text-gray-500">Configure as imagens e textos para esta área.</p>
            </div>

            {/* Agendamento (Apenas para Promoção) */}
            {hints.showSchedule && (
                <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div>
                        <label className="block text-xs font-bold text-blue-800 mb-1">Início (Opcional)</label>
                        <input type="datetime-local" name="start_date" value={formData.start_date || ''} onChange={handleChange} className="w-full p-2 border border-blue-200 rounded text-sm"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-blue-800 mb-1">Fim (Opcional)</label>
                        <input type="datetime-local" name="end_date" value={formData.end_date || ''} onChange={handleChange} className="w-full p-2 border border-blue-200 rounded text-sm"/>
                    </div>
                    <p className="col-span-2 text-[10px] text-blue-600">*Deixe em branco para exibir imediatamente e sem prazo de validade.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Imagem Principal</label>
                    <p className="text-xs text-amber-600 mt-1 font-semibold">Recomendado: {hints.sizeDesktop}</p>
                    <div className="flex flex-col gap-2 mt-2">
                        <img src={formData.image_url || 'https://placehold.co/600x300/eee/ccc?text=Sem+Imagem'} alt="Preview" className="w-full h-32 object-cover rounded-md border bg-white"/>
                        <input type="text" name="image_url" value={formData.image_url || ''} onChange={handleChange} required placeholder="https://..." className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"/>
                        <input type="file" ref={desktopInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'desktop')} />
                        <button type="button" onClick={() => desktopInputRef.current.click()} disabled={uploading.desktop} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded-md flex items-center justify-center gap-2 disabled:opacity-50">
                            {uploading.desktop ? <><SpinnerIcon className="h-4 w-4"/> Enviando...</> : <><UploadIcon className="h-4 w-4"/> Upload Imagem</>}
                        </button>
                    </div>
                </div>
                
                {hints.showMobile && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Imagem Mobile (Opcional)</label>
                        <div className="flex flex-col gap-2 mt-2">
                            <img src={formData.image_url_mobile || 'https://placehold.co/300x400/eee/ccc?text=Mobile'} alt="Preview Mobile" className="w-full h-32 object-contain rounded-md border bg-white"/>
                            <input type="text" name="image_url_mobile" value={formData.image_url_mobile || ''} onChange={handleChange} placeholder="https://..." className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"/>
                            <input type="file" ref={mobileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'mobile')} />
                            <button type="button" onClick={() => mobileInputRef.current.click()} disabled={uploading.mobile} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded-md flex items-center justify-center gap-2 disabled:opacity-50">
                                {uploading.mobile ? <><SpinnerIcon className="h-4 w-4"/> Enviando...</> : <><UploadIcon className="h-4 w-4"/> Upload Mobile</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>

             <div>
                <label className="block text-sm font-medium text-gray-700">Link de Destino</label>
                <input type="text" name="link_url" value={formData.link_url} onChange={handleChange} required placeholder="Ex: products?category=Blusas" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Título</label>
                    <input type="text" name="title" value={formData.title || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Subtítulo</label>
                    <input type="text" name="subtitle" value={formData.subtitle || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                 <div className="flex items-center pt-2">
                    <input type="checkbox" name="cta_enabled" id="cta_enabled_form" checked={!!formData.cta_enabled} onChange={handleChange} className="h-4 w-4 text-amber-600 border-gray-300 rounded"/>
                    <label htmlFor="cta_enabled_form" className="ml-2 block text-sm font-medium text-gray-700">Exibir Botão?</label>
                </div>
                {!!formData.cta_enabled && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Texto do Botão</label>
                        <input type="text" name="cta_text" value={formData.cta_text || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                    </div>
                )}
            </div>

             <div className="flex items-center">
                <input type="checkbox" name="is_active" id="is_active_form" checked={!!formData.is_active} onChange={handleChange} className="h-4 w-4 text-amber-600 border-gray-300 rounded"/>
                <label htmlFor="is_active_form" className="ml-2 block text-sm text-gray-700 font-bold">Banner Ativo</label>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-amber-500 text-black rounded-md hover:bg-amber-400 font-bold shadow-md">Salvar</button>
            </div>
        </form>
    );
};

const SortableBannerCard = ({ banner, onEdit, onDelete, isLastItem }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: banner.id });
    const style = { transform: CSS.Transform.toString(transform), transition, touchAction: 'none' };

    return (
        <div ref={setNodeRef} style={style} className={`bg-white border rounded-lg shadow-sm overflow-hidden group relative ${!banner.is_active ? 'opacity-50' : ''} ${isLastItem ? 'border-2 border-amber-500 ring-2 ring-amber-100' : ''}`}>
             {isLastItem && (
                 <div className="absolute top-0 left-0 bg-amber-500 text-black text-[10px] font-bold px-2 py-1 z-20 shadow-md">
                     DESTAQUE (HOME)
                 </div>
             )}
             <div {...attributes} {...listeners} className="absolute top-2 right-2 p-2 bg-black/40 rounded-full cursor-grab active:cursor-grabbing text-white opacity-0 group-hover:opacity-100 transition-opacity z-10" title="Arraste para reordenar">
                <BarsGripIcon className="h-5 w-5" />
            </div>
            <img src={banner.image_url} alt={banner.title || 'Banner'} className="w-full h-32 object-cover"/>
            <div className="p-3">
                <p className="font-bold text-sm truncate">{banner.title || "Banner sem título"}</p>
                <p className="text-xs text-gray-500 truncate">Link: {banner.link_url}</p>
                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${banner.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                        {banner.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => onEdit(banner)} className="p-1 text-gray-400 hover:text-amber-600"><EditIcon className="h-5 w-5"/></button>
                        <button onClick={() => onDelete(banner.id)} className="p-1 text-gray-400 hover:text-red-600"><TrashIcon className="h-5 w-5"/></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AdminBanners = () => {
    const [banners, setBanners] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('promo'); 
    const [editingBanner, setEditingBanner] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const notification = useNotification();
    const confirmation = useConfirmation();
    const sensors = useSensors(useSensor(PointerSensor));

    const fetchBanners = useCallback(() => {
        setIsLoading(true);
        apiService('/banners/admin')
            .then(data => {
                if (Array.isArray(data)) {
                    setBanners(data);
                } else {
                    setBanners([]);
                }
            })
            .catch(err => notification.show(`Erro ao buscar banners: ${err.message}`, 'error'))
            .finally(() => setIsLoading(false));
    }, [notification]);

    useEffect(() => { fetchBanners() }, [fetchBanners]);

    // --- POPULAR BANCO DE DADOS (ACIONA O BACKEND) ---
    const handleInitializeDefaults = async () => {
        confirmation.show("Deseja popular o banco com as campanhas sazonais padrão? (Não duplicará existentes)", async () => {
            setIsGenerating(true);
            try {
                // Chama a nova rota do backend que contém a inteligência e os dados
                const response = await apiService('/banners/seed-defaults', 'POST');
                notification.show(response.message);
                fetchBanners();
            } catch (error) {
                notification.show(`Erro ao popular: ${error.message}`, 'error');
            } finally {
                setIsGenerating(false);
            }
        });
    };

    // Separação dos banners vindos do Banco
    const carouselBanners = banners.filter(b => b.display_order < 50).sort((a, b) => a.display_order - b.display_order);
    
    // Lista de Destaques (Ordem 50)
    const promoBanners = banners.filter(b => b.display_order === 50).sort((a, b) => {
        if (!a.start_date) return -1;
        if (!b.start_date) return 1;
        return new Date(a.start_date) - new Date(b.start_date);
    });

    const card1 = banners.find(b => b.display_order === 60);
    const card2 = banners.find(b => b.display_order === 61);
    const displayCards = [card1, card2];

    const handleOpenModal = (banner, section) => {
        let initialData = banner ? { ...banner } : {};
        
        if (!banner) {
            if (section === 'carousel') {
                const maxOrder = carouselBanners.length > 0 ? Math.max(...carouselBanners.map(b => b.display_order)) : -1;
                initialData = { 
                    name: '', link_url: '', image_url: '', image_url_mobile: '', is_active: 1, 
                    cta_enabled: 1, cta_text: 'Ver Mais', display_order: maxOrder + 1 
                };
            } else if (section === 'promo') {
                initialData = { name: '', link_url: '', image_url: '', is_active: 1, cta_enabled: 1, display_order: 50 };
            } else if (section === 'cards') {
                // Tenta preencher o slot vazio (60 ou 61)
                const nextSlot = !card1 ? 60 : 61;
                initialData = { name: '', link_url: '', image_url: '', is_active: 1, cta_enabled: 1, display_order: nextSlot };
            }
        }
        setEditingBanner(initialData);
        setIsModalOpen(true);
    };

    const handleSave = async (formData) => {
        try {
            const payload = { ...formData, display_order: parseInt(formData.display_order) };
            if (!payload.start_date) payload.start_date = null;
            if (!payload.end_date) payload.end_date = null;

            if (formData.id) {
                await apiService(`/banners/${formData.id}`, 'PUT', payload);
                notification.show('Atualizado!');
            } else {
                await apiService('/banners/admin', 'POST', payload);
                notification.show('Criado!');
            }
            fetchBanners();
            setIsModalOpen(false);
        } catch (error) {
            notification.show(`Erro: ${error.message}`, 'error');
        }
    };

    const handleDelete = (id) => {
        if (!id) return;
        confirmation.show(
            "Excluir este banner permanentemente?", 
            async () => {
                try {
                    await apiService(`/banners/${id}`, 'DELETE');
                    notification.show('Excluído.');
                    fetchBanners();
                } catch (error) {
                    notification.show(`Erro: ${error.message}`, 'error');
                }
            },
            { 
                confirmText: "Excluir", 
                confirmColor: "bg-red-600 hover:bg-red-700",
                requiresAuth: true // Segurança adicionada
            }
        );
    };
    
    // Drag & Drop do Carrossel (Topo)
    const handleDragEndCarousel = async (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = carouselBanners.findIndex((b) => b.id === active.id);
            const newIndex = carouselBanners.findIndex((b) => b.id === over.id);
            const newOrder = arrayMove(carouselBanners, oldIndex, newIndex);
            
            // Atualiza UI localmente para evitar flick
            const others = banners.filter(b => b.display_order >= 50);
            setBanners([...newOrder, ...others]);

            const orderedIds = newOrder.map(b => b.id);
            try {
                await apiService('/banners/order', 'PUT', { orderedIds });
                notification.show('Ordem salva!');
            } catch (error) {
                notification.show('Erro ao salvar ordem.', 'error');
                fetchBanners();
            }
        }
    };

    return (
        <div>
            <AnimatePresence>
                {isModalOpen && (
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Editor de Banner">
                         <BannerForm item={editingBanner} section={activeTab} onSave={handleSave} onCancel={() => setIsModalOpen(false)} />
                    </Modal>
                )}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Gestão Visual</h1>
                    <p className="text-gray-500">Controle total via Banco de Dados.</p>
                </div>
                
                {/* Botão de Inicialização (Seed) - Visível se não houver destaques */}
                {promoBanners.length === 0 && (
                    <button 
                        onClick={handleInitializeDefaults} 
                        disabled={isGenerating}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2 text-sm font-bold shadow-md animate-pulse"
                    >
                        {isGenerating ? <SpinnerIcon/> : <SparklesIcon className="h-5 w-5"/>}
                        Inicializar Banco com Padrões
                    </button>
                )}
            </div>

            <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-lg shadow-sm">
                {['promo', 'cards', 'carousel'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)} 
                        className={`flex-1 px-6 py-4 font-bold text-sm transition-all border-b-2 capitalize ${activeTab === tab ? 'border-amber-500 text-amber-600 bg-amber-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        {tab === 'promo' ? 'Destaques Agendados' : (tab === 'cards' ? 'Cards Inferiores' : 'Carrossel Topo')}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="py-20 flex justify-center"><SpinnerIcon className="h-8 w-8 text-amber-500"/></div>
            ) : (
                <>
                    {/* --- ABA DESTAQUES (CAMPANHAS) --- */}
                    {activeTab === 'promo' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <div>
                                    <h3 className="font-bold text-blue-900">Campanhas de Destaque</h3>
                                    <p className="text-xs text-blue-700">Listagem direta do banco. Apenas 1 banner (o com data válida mais próxima) aparecerá na Home.</p>
                                </div>
                                <button onClick={() => handleOpenModal(null, 'promo')} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm font-bold shadow-sm">
                                    <PlusIcon className="h-4 w-4"/> Criar Campanha
                                </button>
                            </div>

                            {promoBanners.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {promoBanners.map(banner => {
                                        const now = new Date();
                                        const start = banner.start_date ? new Date(banner.start_date) : null;
                                        const end = banner.end_date ? new Date(banner.end_date) : null;
                                        
                                        // CORREÇÃO CRÍTICA DO "0": Usar !! para converter para booleano real
                                        const isActiveNow = !!banner.is_active && (!start || now >= start) && (!end || now <= end);
                                        // Verifica se é o Padrão (sem datas)
                                        const isDefault = !start && !end;
                                        
                                        return (
                                            <div key={banner.id} className={`flex flex-col md:flex-row bg-white border rounded-lg overflow-hidden shadow-sm ${isActiveNow ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-200 opacity-80'}`}>
                                                <div className="w-full md:w-48 h-32 bg-gray-100 relative">
                                                    <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover"/>
                                                    
                                                    {/* Renderização Condicional Corrigida */}
                                                    {isActiveNow && <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] px-2 py-1 rounded font-bold shadow">NO AR</span>}
                                                    {isDefault && <span className="absolute bottom-2 left-2 bg-gray-600 text-white text-[10px] px-2 py-1 rounded font-bold shadow">PADRÃO</span>}
                                                </div>
                                                <div className="p-4 flex-grow flex flex-col justify-center">
                                                    <h4 className="font-bold text-gray-800 text-lg">{banner.title}</h4>
                                                    <p className="text-sm text-gray-500">{banner.subtitle}</p>
                                                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                                                        {start ? (
                                                            <>
                                                                <span className="bg-blue-50 px-2 py-1 rounded border border-blue-100"><ClockIcon className="h-3 w-3 inline mr-1"/> De: {start.toLocaleDateString()}</span>
                                                                <span className="bg-blue-50 px-2 py-1 rounded border border-blue-100">Até: {end ? end.toLocaleDateString() : 'Indefinido'}</span>
                                                            </>
                                                        ) : (
                                                            <span className="bg-gray-100 px-2 py-1 rounded border">Sem agendamento (Exibido se nenhum outro estiver ativo)</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="p-4 flex md:flex-col justify-center gap-2 border-t md:border-t-0 md:border-l bg-gray-50">
                                                    <button onClick={() => handleOpenModal(banner, 'promo')} className="px-3 py-2 bg-white border border-gray-300 rounded text-gray-700 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 font-bold text-xs flex items-center justify-center gap-1">
                                                        <EditIcon className="h-4 w-4"/> Editar
                                                    </button>
                                                    <button onClick={() => handleDelete(banner.id)} className="px-3 py-2 bg-white border border-gray-300 rounded text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300 font-bold text-xs flex items-center justify-center gap-1">
                                                        <TrashIcon className="h-4 w-4"/> Excluir
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg">
                                    <p className="text-gray-400 mb-4">Nenhuma campanha no banco. Clique em "Inicializar Banco" acima.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- ABA CARDS --- */}
                    {activeTab === 'cards' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center bg-purple-50 p-4 rounded-lg border border-purple-100">
                                <p className="text-sm text-purple-800">Cards fixos inferiores (Posições 60 e 61).</p>
                                {(!card1 || !card2) && <button onClick={() => handleOpenModal(null, 'cards')} className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm">Adicionar Card</button>}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[card1, card2].map((card, idx) => (
                                    card ? (
                                        <SortableBannerCard 
                                            key={card.id} 
                                            banner={card} 
                                            onEdit={() => handleOpenModal(card, 'cards')} 
                                            onDelete={() => handleDelete(card.id)} 
                                            customLabel={idx === 0 ? "Esquerda" : "Direita"}
                                            customColor="bg-purple-600 text-white"
                                            description={card.subtitle}
                                        />
                                    ) : (
                                        <div key={idx} className="h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                                            <p className="text-sm font-bold">Slot {idx === 0 ? 'Esquerdo' : 'Direito'} Vazio</p>
                                            <button onClick={() => handleOpenModal(null, 'cards')} className="text-amber-600 hover:underline text-sm font-bold flex items-center gap-1 mt-2">
                                                <PlusIcon className="h-4 w-4"/> Adicionar Manualmente
                                            </button>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- ABA CARROSSEL --- */}
                    {activeTab === 'carousel' && (
                         <div className="space-y-4 animate-fade-in">
                            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <p className="text-sm text-gray-600">Banners do topo. Arraste para ordenar.</p>
                                <button onClick={() => handleOpenModal(null, 'carousel')} className="bg-gray-800 text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm">Novo Banner</button>
                            </div>
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndCarousel}>
                                <SortableContext items={carouselBanners} strategy={rectSortingStrategy}>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {carouselBanners.map((banner) => (
                                            <SortableBannerCard 
                                                key={banner.id} 
                                                banner={banner} 
                                                onEdit={(b) => handleOpenModal(b, 'carousel')} 
                                                onDelete={() => handleDelete(banner.id)}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                            {carouselBanners.length === 0 && <p className="text-center text-gray-400 py-10">Carrossel vazio.</p>}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const UserEditForm = ({ user, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'user',
        password: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Função</label>
                <select name="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md">
                    <option value="user">Usuário</option>
                    <option value="admin">Administrador</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Nova Senha</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Deixe em branco para não alterar" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 font-semibold">Salvar Alterações</button>
            </div>
        </form>
    );
};

const UserDetailsModal = ({ user, onClose, onUserUpdate }) => {
    const [details, setDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailSubject, setEmailSubject] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const notification = useNotification();
    const confirmation = useConfirmation();

    const fetchDetails = useCallback(() => {
        if (user) {
            setIsLoading(true);
            apiService(`/users/${user.id}/details`)
                .then(setDetails)
                .catch(err => notification.show(`Erro ao buscar detalhes: ${err.message}`, 'error'))
                .finally(() => setIsLoading(false));
        }
    }, [user, notification]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    const handleStatusChange = () => {
        if (!details) return;
        const newStatus = details.status === 'active' ? 'blocked' : 'active';
        const actionText = newStatus === 'blocked' ? 'bloquear' : 'desbloquear';

        confirmation.show(
            `Tem certeza que deseja ${actionText} este usuário? Esta ação requer confirmação.`, 
            async () => {
                try {
                    await apiService(`/users/${details.id}/status`, 'PUT', { status: newStatus });
                    notification.show(`Usuário ${actionText} com sucesso.`);
                    onUserUpdate();
                    fetchDetails();
                } catch (error) {
                    notification.show(`Erro ao ${actionText} usuário: ${error.message}`, 'error');
                }
            },
            { requiresAuth: true }
        );
    };

    const handleSaveUser = async (formData) => {
        try {
            await apiService(`/users/${details.id}`, 'PUT', formData);
            notification.show('Usuário atualizado com sucesso!');
            setIsEditModalOpen(false);
            onUserUpdate();
            fetchDetails();
        } catch (error) {
            notification.show(`Erro ao atualizar usuário: ${error.message}`, 'error');
        }
    };
    
    const handleSendEmail = (e) => {
        e.preventDefault();
        
        confirmation.show(
            `Você está prestes a enviar um e-mail para ${details.name}. Por favor, confirme sua identidade para continuar.`,
            async () => {
                setIsSendingEmail(true);
                try {
                    const result = await apiService(`/users/${details.id}/send-email`, 'POST', {
                        subject: emailSubject,
                        message: emailMessage
                    });
                    notification.show(result.message);
                    setIsEmailModalOpen(false);
                    setEmailSubject('');
                    setEmailMessage('');
                } catch (error) {
                    notification.show(`Erro ao enviar e-mail: ${error.message}`, 'error');
                } finally {
                    setIsSendingEmail(false);
                }
            },
            { requiresAuth: true, confirmText: 'Confirmar e Enviar' }
        );
    };
    
    const handleDelete = () => {
        confirmation.show(
            "Tem certeza que deseja EXCLUIR este usuário? Esta ação não pode ser desfeita.", 
            async () => {
                try {
                    await apiService(`/users/${details.id}`, 'DELETE');
                    notification.show('Usuário excluído com sucesso.');
                    onUserUpdate();
                    onClose();
                } catch (error) {
                    notification.show(`Erro ao excluir usuário: ${error.message}`, 'error');
                }
            },
            { requiresAuth: true, confirmText: 'Excluir Usuário', confirmColor: 'bg-red-600 hover:bg-red-700' }
        );
    };

    const openEditModalWithConfirmation = () => {
        confirmation.show(
            "Você está prestes a editar os dados de um usuário, incluindo permissões de acesso. Por favor, confirme sua identidade para continuar.",
            () => {
                setIsEditModalOpen(true);
            },
            { requiresAuth: true, confirmText: 'Continuar para Edição' }
        );
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Detalhes de ${user.name}`} size="3xl">
            <AnimatePresence>
                {isEditModalOpen && (
                    <Modal isOpen={true} onClose={() => setIsEditModalOpen(false)} title={`Editar Usuário: ${details.name}`}>
                        <UserEditForm user={details} onSave={handleSaveUser} onCancel={() => setIsEditModalOpen(false)} />
                    </Modal>
                )}
            </AnimatePresence>
            
            <AnimatePresence>
                {isEmailModalOpen && (
                    <Modal isOpen={true} onClose={() => setIsEmailModalOpen(false)} title={`Enviar E-mail para ${details.name}`}>
                        <form onSubmit={handleSendEmail} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Assunto</label>
                                <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Mensagem</label>
                                <textarea value={emailMessage} onChange={e => setEmailMessage(e.target.value)} required rows="6" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
                            </div>
                            <div className="flex justify-end pt-2">
                                <button type="submit" disabled={isSendingEmail} className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 font-semibold flex items-center gap-2 disabled:bg-gray-400">
                                    {isSendingEmail ? <SpinnerIcon className="h-5 w-5"/> : <PaperAirplaneIcon className="h-5 w-5"/>}
                                    {isSendingEmail ? 'Enviando...' : 'Enviar E-mail'}
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>

            {isLoading || !details ? (
                <div className="flex justify-center items-center h-64"><SpinnerIcon className="h-8 w-8 text-amber-500" /></div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg border grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <h4 className="text-sm font-bold text-gray-500">Nome</h4>
                            <p className="truncate">{details.name}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-500">Email</h4>
                            <p className="truncate">{details.email}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-500">CPF</h4>
                            <p>{details.cpf}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-500">Status</h4>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${details.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {details.status === 'active' ? 'Ativo' : 'Bloqueado'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Últimos Pedidos (5)</h3>
                            <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                                {details.orders.length > 0 ? (
                                    <table className="w-full text-sm text-left"><tbody>
                                        {details.orders.map(order => (
                                            <tr key={order.id} className="border-b last:border-b-0"><td className="p-2 font-mono">#{order.id}</td><td className="p-2">{new Date(order.date).toLocaleDateString()}</td><td className="p-2">R$ {Number(order.total).toFixed(2)}</td><td className="p-2">{order.status}</td></tr>
                                        ))}
                                    </tbody></table>
                                ) : (<p className="text-center text-gray-500 p-4">Nenhum pedido encontrado.</p>)}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Últimos Logins (10)</h3>
                            <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                               {details.loginHistory.length > 0 ? (
                                    <table className="w-full text-sm text-left"><tbody>
                                        {details.loginHistory.map((login, index) => (
                                            <tr key={index} className="border-b last:border-b-0"><td className="p-2">{new Date(login.created_at).toLocaleString('pt-BR')}</td><td className="p-2">{login.ip_address}</td><td className={`p-2 font-semibold ${login.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{login.status === 'success' ? 'Sucesso' : 'Falha'}</td></tr>
                                        ))}
                                    </tbody></table>
                               ) : (<p className="text-center text-gray-500 p-4">Nenhum histórico de login.</p>)}
                           </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
                        <button onClick={handleDelete} className="px-4 py-2 rounded-md font-semibold text-red-600 bg-red-100 hover:bg-red-200 flex items-center gap-2"><TrashIcon className="h-4 w-4"/> Excluir</button>
                        <button onClick={openEditModalWithConfirmation} className="px-4 py-2 rounded-md font-semibold text-blue-600 bg-blue-100 hover:bg-blue-200 flex items-center gap-2"><EditIcon className="h-4 w-4"/> Editar</button>
                        <button onClick={() => setIsEmailModalOpen(true)} className="px-4 py-2 rounded-md font-semibold text-purple-600 bg-purple-100 hover:bg-purple-200 flex items-center gap-2"><PaperAirplaneIcon className="h-4 w-4"/> Enviar E-mail</button>
                        <button onClick={handleStatusChange} className={`px-6 py-2 rounded-md font-semibold text-white ${details.status === 'active' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                            {details.status === 'active' ? 'Bloquear' : 'Desbloquear'}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

const CollectionCategoryForm = ({ item, onSave, onCancel }) => {
    const [formData, setFormData] = useState(item);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const notification = useNotification();

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
        }));
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const uploadResult = await apiImageUploadService('/upload/image', file);
            setFormData(prev => ({ ...prev, image: uploadResult.imageUrl }));
            notification.show('Upload da imagem concluído!');
        } catch (error) {
            notification.show(`Erro no upload: ${error.message}`, 'error');
        } finally {
            setIsUploading(false);
            event.target.value = '';
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const menuSections = ['Perfumaria', 'Roupas', 'Conjuntos', 'Moda Íntima', 'Calçados', 'Acessórios'];
    const productTypeAssociations = [{value: 'none', label: 'Nenhuma'}, {value: 'perfume', label: 'Perfume'}, {value: 'clothing', label: 'Roupa'}];

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Nome da Categoria</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Valor do Filtro</label>
                <input type="text" name="filter" value={formData.filter} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Imagem</label>
                <div className="flex items-center gap-2 mt-1">
                    <img src={formData.image || 'https://placehold.co/100x100/eee/ccc?text=?'} alt="Preview" className="w-20 h-20 object-cover rounded-md border bg-gray-100"/>
                    <div className="flex-grow">
                        <input type="text" name="image" value={formData.image} onChange={handleChange} required placeholder="https://..." className="block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                        <button type="button" onClick={() => fileInputRef.current.click()} disabled={isUploading} className="mt-2 w-full text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded-md flex items-center justify-center gap-2 disabled:opacity-50">
                            {isUploading ? <><SpinnerIcon className="h-4 w-4"/> Enviando...</> : <><UploadIcon className="h-4 w-4"/> Fazer Upload</>}
                        </button>
                    </div>
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Seção Principal do Menu</label>
                <select name="menu_section" value={formData.menu_section} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md">
                    {menuSections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Associar à Categoria de Produto (no form de produto)</label>
                <select name="product_type_association" value={formData.product_type_association} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md">
                     {productTypeAssociations.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>
             <div className="flex items-center">
                <input type="checkbox" name="is_active" id="is_active_form" checked={!!formData.is_active} onChange={handleChange} className="h-4 w-4 text-amber-600 border-gray-300 rounded"/>
                <label htmlFor="is_active_form" className="ml-2 block text-sm text-gray-700">Ativa (visível na loja)</label>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 font-semibold">Salvar</button>
            </div>
        </form>
    );
};

const SortableCategoryCard = ({ cat, onEdit, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: cat.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className={`bg-white border rounded-lg shadow-sm overflow-hidden group flex flex-col relative ${!cat.is_active ? 'opacity-60' : ''}`}>
            <div 
                {...attributes} 
                {...listeners} 
                style={{ touchAction: 'none' }} // Aplica a regra de toque apenas no ícone
                className="absolute top-2 right-2 p-1.5 bg-black/30 rounded-full cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Arraste para reordenar"
            >
                <BarsGripIcon className="h-5 w-5 text-white" />
            </div>

            <div className="relative aspect-[4/5]">
                <img src={cat.image || 'https://placehold.co/400x500/eee/ccc?text=Sem+Imagem'} alt={cat.name} className="w-full h-full object-cover"/>
                <div className={`absolute top-2 left-2 px-2 py-0.5 text-xs font-bold text-white rounded-full ${cat.is_active ? 'bg-green-500' : 'bg-gray-500'}`}>
                    {cat.is_active ? 'Ativa' : 'Inativa'}
                </div>
            </div>
            <div className="p-3 bg-gray-50 flex-grow flex flex-col">
                <h3 className="font-semibold text-gray-800 text-sm text-center truncate flex-grow" title={cat.name}>{cat.name}</h3>
                <div className="flex items-center justify-center space-x-4 mt-3 pt-3 border-t">
                    <button onClick={() => onEdit(cat)} className="p-2 text-gray-500 hover:text-amber-600" title="Editar"><EditIcon className="h-5 w-5"/></button>
                    <button onClick={() => onDelete(cat.id)} className="p-2 text-gray-500 hover:text-red-600" title="Excluir"><TrashIcon className="h-5 w-5"/></button>
                </div>
            </div>
        </div>
    );
};

const AdminCollections = () => {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const notification = useNotification();
    const confirmation = useConfirmation();
    const sensors = useSensors(useSensor(PointerSensor));

    const fetchCategories = useCallback(() => {
        setIsLoading(true);
        apiService('/collections/admin')
            .then(data => {
                if (!Array.isArray(data)) {
                    notification.show("Erro: A resposta da API é inválida.", 'error');
                    setCategories([]);
                } else {
                    setCategories(data);
                }
            })
            .catch(err => {
                notification.show(`Erro ao buscar categorias: ${err.message}`, 'error');
                setCategories([]);
            })
            .finally(() => setIsLoading(false));
    }, [notification]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleOpenModal = (category = null) => {
        const initialData = category ? 
            {...category} : 
            { name: '', filter: '', image: '', is_active: 1, product_type_association: 'none', menu_section: 'Roupas'};
        setEditingCategory(initialData);
        setIsModalOpen(true);
    };

    const handleSave = async (formData) => {
        try {
            if (editingCategory && editingCategory.id) {
                await apiService(`/collections/${editingCategory.id}`, 'PUT', formData);
                notification.show('Categoria atualizada com sucesso!');
            } else {
                await apiService('/collections/admin', 'POST', formData);
                notification.show('Categoria criada com sucesso!');
            }
            fetchCategories();
            setIsModalOpen(false);
        } catch (error) {
            notification.show(`Erro ao salvar: ${error.message}`, 'error');
        }
    };

    const handleDelete = (id) => {
        confirmation.show("Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.", async () => {
            try {
                await apiService(`/collections/${id}`, 'DELETE');
                notification.show('Categoria deletada com sucesso.');
                fetchCategories();
            } catch (error) {
                notification.show(`Erro ao deletar: ${error.message}`, 'error');
            }
        });
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = categories.findIndex((c) => c.id === active.id);
            const newIndex = categories.findIndex((c) => c.id === over.id);
            const newOrder = arrayMove(categories, oldIndex, newIndex);
            
            setCategories(newOrder); // Atualização otimista da UI

            setIsSavingOrder(true);
            const orderedIds = newOrder.map(c => c.id);
            try {
                await apiService('/collections/order', 'PUT', { orderedIds });
                notification.show('Ordem salva com sucesso!');
            } catch (error) {
                notification.show(`Erro ao salvar a ordem: ${error.message}`, 'error');
                fetchCategories(); // Reverte para a ordem do servidor em caso de erro
            } finally {
                setIsSavingOrder(false);
            }
        }
    };

    return (
        <div>
            <AnimatePresence>
                {isModalOpen && (
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCategory && editingCategory.id ? 'Editar Categoria' : 'Adicionar Nova Categoria'}>
                        <CollectionCategoryForm item={editingCategory} onSave={handleSave} onCancel={() => setIsModalOpen(false)} />
                    </Modal>
                )}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold">Gerenciar Coleções</h1>
                <div className="flex items-center gap-4">
                    {isSavingOrder && <div className="flex items-center gap-2 text-sm text-gray-500"><SpinnerIcon/> Salvando ordem...</div>}
                    <button onClick={() => handleOpenModal()} className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900 flex items-center space-x-2 flex-shrink-0">
                        <PlusIcon className="h-5 w-5"/> <span>Nova Categoria</span>
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-500"/></div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={categories} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {categories.map(cat => (
                                <SortableCategoryCard key={cat.id} cat={cat} onEdit={handleOpenModal} onDelete={handleDelete} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
};

// --- COMPONENTE DO BOTÃO DE INSTALAÇÃO PWA ---
const InstallPWAButton = ({ deferredPrompt }) => {
    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`PWA setup user choice: ${outcome}`);
        }
    };

    return (
        <button
            onClick={handleInstallClick}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-black px-6 py-3 rounded-full shadow-lg hover:bg-amber-400 font-bold flex items-center gap-2 transition-transform hover:scale-105" // <-- Classe 'bottom-6' alterada para 'bottom-20'
        >
            <DownloadIcon className="h-5 w-5" />
            <span>Instalar App</span>
        </button>
    );
};

const BannerCarousel = memo(({ banners, onNavigate }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const minSwipeDistance = 50;

    useEffect(() => {
        setCurrentIndex(0);
    }, [banners]);

    const goNext = useCallback(() => {
        if (!banners || banners.length === 0) return;
        setCurrentIndex(prev => (prev === banners.length - 1 ? 0 : prev + 1));
    }, [banners]);

    const goPrev = useCallback(() => {
        if (!banners || banners.length === 0) return;
        setCurrentIndex(prev => (prev === 0 ? banners.length - 1 : prev - 1));
    }, [banners]);

    useEffect(() => {
        if (banners && banners.length > 1) {
            const timer = setTimeout(goNext, 5000);
            return () => clearTimeout(timer);
        }
    }, [currentIndex, banners, goNext]);
    
    const handleTouchStart = (e) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
    const handleTouchMove = (e) => { setTouchEnd(e.targetTouches[0].clientX); };
    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd || !banners || banners.length <= 1) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;
        if (isLeftSwipe) goNext();
        else if (isRightSwipe) goPrev();
        setTouchStart(null);
        setTouchEnd(null);
    };

    const bannerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.2 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
    };

    if (!banners || banners.length === 0) return null;
    
    const isMobile = window.innerWidth < 640;
    const currentBanner = banners[currentIndex];
    
    if (!currentBanner) return null;

    const imageUrl = isMobile && currentBanner.image_url_mobile ? currentBanner.image_url_mobile : currentBanner.image_url;

    return (
        <section 
            className="relative h-[90vh] sm:h-[70vh] w-full overflow-hidden group bg-black"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentBanner.id || currentIndex}
                    className="absolute inset-0 cursor-pointer"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    onClick={() => onNavigate(currentBanner.link_url.replace(/^#/, ''))}
                >
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} />
                    <div className="absolute inset-0 bg-black/40" />
                    
                    {(currentBanner.title || currentBanner.subtitle || currentBanner.cta_enabled) && (
                         <motion.div 
                            className="relative z-10 h-full flex flex-col items-center justify-center text-center text-white p-4"
                            variants={bannerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            key={`content-${currentBanner.id}`}
                         >
                            {currentBanner.title && (
                                <motion.h1 
                                    variants={itemVariants}
                                    className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-wider drop-shadow-lg"
                                >
                                    {currentBanner.title}
                                </motion.h1>
                            )}
                            {currentBanner.subtitle && (
                                <motion.p 
                                    variants={itemVariants}
                                    className="text-lg md:text-xl mt-4 max-w-2xl text-gray-200"
                                >
                                    {currentBanner.subtitle}
                                </motion.p>
                            )}
                             {currentBanner.cta_enabled === 1 && currentBanner.cta_text && (
                                <motion.div variants={itemVariants}>
                                    <button className="mt-8 bg-amber-400 text-black px-8 sm:px-10 py-3 rounded-md text-lg font-bold hover:bg-amber-300 transition-colors">
                                        {currentBanner.cta_text}
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </motion.div>
            </AnimatePresence>

            {banners.length > 1 && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/30 rounded-full text-white md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/30 rounded-full text-white md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
                        {banners.map((_, index) => (
                            <button key={index} onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }} className={`w-3 h-3 rounded-full transition-colors ${currentIndex === index ? 'bg-amber-400' : 'bg-white/50'}`} />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
});

// --- COMPONENTE PRINCIPAL DA APLICAÇÃO ---

// --- Função auxiliar para converter a chave VAPID ---
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function AppContent({ deferredPrompt }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || 'home');
  const [isInMaintenance, setIsInMaintenance] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(true);

  // Efeito para buscar o status de manutenção
  useEffect(() => {
    const checkStatus = () => {
        apiService('/settings/maintenance-status')
            .then(data => {
                const isNowInMaintenance = data.maintenanceMode === 'on';
                setIsInMaintenance(prevStatus => {
                    if (prevStatus !== isNowInMaintenance) {
                        return isNowInMaintenance;
                    }
                    return prevStatus;
                });
            })
            .catch(err => {
                console.error("Falha ao verificar manutenção.", err);
                setIsInMaintenance(false);
            })
            .finally(() => {
                if (isStatusLoading) {
                    setIsStatusLoading(false);
                }
            });
    };

    checkStatus(); 
    const intervalId = setInterval(checkStatus, 30000); 
    return () => clearInterval(intervalId); 
  }, [isStatusLoading]); 

  // Lógica de Registro de Push Notifications
  useEffect(() => {
    const registerPush = async () => {
        if (!isAuthenticated || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
        try {
            const registration = await navigator.serviceWorker.ready;
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;

            const publicVapidKey = "BGDEC_rvB5lgb2pzKg8bZMwAfOwohu0sf_777oDMYHV1dTQzV1Q4UgU2eFXj_2IVoFlKvN3YkrETqNJVSje0t4g";
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            });
            await apiService('/notifications/subscribe', 'POST', subscription);
        } catch (error) {
            console.error('Erro ao registrar push:', error);
        }
    };
    registerPush();
  }, [isAuthenticated]); 

  const navigate = useCallback((path) => {
    window.location.hash = path;
  }, []);
  
  // Redirecionamento de retorno do MP
  useEffect(() => {
    const checkPendingOrder = () => {
        const pendingOrderId = sessionStorage.getItem('pendingOrderId');
        if (pendingOrderId && !window.location.hash.includes('order-success')) {
            navigate(`order-success/${pendingOrderId}`);
        }
    };
    checkPendingOrder();
    window.addEventListener('focus', checkPendingOrder);
    window.addEventListener('visibilitychange', checkPendingOrder);
    return () => {
        window.removeEventListener('focus', checkPendingOrder);
        window.removeEventListener('visibilitychange', checkPendingOrder);
    };
  }, [navigate]); 
  
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash.slice(1) || 'home');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPath]);
  
  if (isLoading || isStatusLoading) {
      return (
        <div className="h-screen flex items-center justify-center bg-black">
            <SpinnerIcon className="h-8 w-8 text-amber-400"/>
        </div>
      );
  }

  const isAdminLoggedIn = isAuthenticated && user.role === 'admin';
  const isAdminDomain = window.location.hostname.includes('vercel.app');

  if (isInMaintenance && !isAdminLoggedIn && !isAdminDomain) {
      return <MaintenancePage />;
  }

  const renderPage = () => {
    const [path, queryString] = currentPath.split('?');
    const searchParams = new URLSearchParams(queryString);
    const initialSearch = searchParams.get('search') || '';
    const initialCategory = searchParams.get('category') || '';
    const initialBrand = searchParams.get('brand') || '';
    const initialIsPromo = searchParams.get('promo') === 'true';
    
    const pathParts = path.split('/');
    const mainPage = pathParts[0];
    const pageId = pathParts[1];

    if (mainPage === 'admin') {
        if (!isAuthenticated || user.role !== 'admin') {
             return <LoginPage onNavigate={navigate} />;
        }
        
        const adminSubPage = pageId || 'dashboard';
        const adminPages = {
            'dashboard': <AdminDashboard onNavigate={navigate} />, 
            'banners': <AdminBanners />,
            'products': <AdminProducts onNavigate={navigate} />,
            'orders': <AdminOrders />,
            'refunds': <AdminRefunds onNavigate={navigate} />,
            'collections': <AdminCollections />,
            'users': <AdminUsers />,
            'coupons': <AdminCoupons />,
            'reports': <AdminReports />,
            'logs': <AdminLogsPage />,
            'newsletter': <AdminNewsletter />, 
            'shipping': <AdminShippingSettings />, 
        };

        return (
            <AdminLayout activePage={adminSubPage} onNavigate={navigate}>
                {adminPages[adminSubPage] || <AdminDashboard onNavigate={navigate} />}
            </AdminLayout>
        );
    }

    // --- ATUALIZAÇÃO AQUI ---
    // Se o usuário tenta acessar uma página protegida (como account ou checkout) sem estar logado,
    // passamos o 'redirectPath' para a LoginPage. Assim, ao logar, ele volta para cá.
    if ((mainPage === 'account' || mainPage === 'wishlist' || mainPage === 'checkout') && !isAuthenticated) {
        return <LoginPage onNavigate={navigate} redirectPath={currentPath} />;
    }
    
    if (mainPage === 'product' && pageId) {
        return <ProductDetailPage productId={parseInt(pageId)} onNavigate={navigate} />;
    }

    if (mainPage === 'order-success' && pageId) {
        return <OrderSuccessPage orderId={pageId} onNavigate={navigate} />;
    }
    
    if (mainPage === 'account') {
        return <MyAccountPage onNavigate={navigate} path={pathParts.slice(1).join('/')} />;
    }

   const pages = {
        'home': <HomePage onNavigate={navigate} />,
        'products': <ProductsPage onNavigate={navigate} initialSearch={initialSearch} initialCategory={initialCategory} initialBrand={initialBrand} initialIsPromo={initialIsPromo} />,
        'categories': <CategoriesPage onNavigate={navigate} />, 
        'login': <LoginPage onNavigate={navigate} />,
        'register': <RegisterPage onNavigate={navigate} />,
        'cart': <CartPage onNavigate={navigate} />,
        'checkout': <CheckoutPage onNavigate={navigate} />,
        'wishlist': <WishlistPage onNavigate={navigate} />,
        'ajuda': <AjudaPage onNavigate={navigate} />,
        'about': <AboutPage />,
        'privacy': <PrivacyPolicyPage />,
        'terms': <TermsOfServicePage />,
        'forgot-password': <ForgotPasswordPage onNavigate={navigate} />,
    };
    return pages[mainPage] || <HomePage onNavigate={navigate} />;
  };

  const showHeaderFooter = !currentPath.startsWith('admin');
  
  return (
    <div className="bg-black min-h-screen flex flex-col">
      {showHeaderFooter && <Header onNavigate={navigate} />}
      <main className="flex-grow">{renderPage()}</main>
      {showHeaderFooter && !currentPath.startsWith('order-success') && (
        <footer className="bg-gray-900 text-gray-300 mt-auto border-t border-gray-800">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left">
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-amber-400">LovecestasePerfumes</h3>
                        <p className="text-sm text-gray-400">
                            Elegância que veste e perfuma. Descubra fragrâncias e peças que definem seu estilo e marcam momentos.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-bold text-white tracking-wider">Institucional</h3>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#about" onClick={(e) => { e.preventDefault(); navigate('about'); }} className="hover:text-amber-400 transition-colors">Sobre Nós</a></li>
                            <li><a href="#privacy" onClick={(e) => { e.preventDefault(); navigate('privacy'); }} className="hover:text-amber-400 transition-colors">Política de Privacidade</a></li>
                            <li><a href="#terms" onClick={(e) => { e.preventDefault(); navigate('terms'); }} className="hover:text-amber-400 transition-colors">Termos de Serviço</a></li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-bold text-white tracking-wider">Atendimento</h3>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#ajuda" onClick={(e) => { e.preventDefault(); navigate('ajuda'); }} className="hover:text-amber-400 transition-colors">Central de Ajuda</a></li>
                            <li>
                                <div className="flex justify-center md:justify-start items-center gap-4 mt-2">
                                    <a href="https://wa.me/5583987379573" target="_blank" rel="noopener noreferrer" className="hover:text-green-500 transition-colors"><WhatsappIcon className="h-6 w-6"/></a>
                                    <a href="https://www.instagram.com/lovecestaseperfumesjp/" target="_blank" rel="noopener noreferrer" className="hover:text-pink-500 transition-colors"><InstagramIcon className="h-6 w-6"/></a>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-bold text-white tracking-wider">Segurança e Qualidade</h3>
                        <div className="flex flex-col gap-3 items-center md:items-start text-sm text-gray-400">
                             <div className="flex items-center gap-2">
                                <ShieldCheckIcon className="h-5 w-5 text-green-500"/>
                                <span>Compra 100% Segura</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <CheckBadgeIcon className="h-5 w-5 text-blue-500"/>
                                <span>Produtos Originais</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <TruckIcon className="h-5 w-5 text-amber-500"/>
                                <span>Entrega Garantida</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="bg-black py-4 border-t border-gray-800">
                <p className="text-center text-sm text-gray-500">© {new Date().getFullYear()} LovecestasePerfumes. Todos os direitos reservados.</p>
            </div>
        </footer>
      )}
      
      {deferredPrompt && <InstallPWAButton deferredPrompt={deferredPrompt} />}
    </div>
  );
}
export default function App() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); setDeferredPrompt(e); });
        
        // --- CORREÇÃO DO REGISTRO DO SERVICE WORKER ---
        // O código anterior esperava o evento 'load' que pode já ter passado.
        // Agora verificamos se a página já carregou.
        if ('serviceWorker' in navigator) {
            const registerSW = () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => console.log('SW registrado com sucesso:', registration))
                    .catch(error => console.log('Falha no SW:', error));
            };

            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                registerSW();
            } else {
                window.addEventListener('load', registerSW);
            }
        }

        // Scripts externos
        const loadScript = (src, id, callback) => {
            if (document.getElementById(id)) { if (callback) callback(); return; }
            const script = document.createElement('script');
            script.src = src; script.id = id; script.async = true;
            script.onload = () => { if (callback) callback(); };
            document.body.appendChild(script);
        };
        loadScript('https://cdn.jsdelivr.net/npm/chart.js', 'chartjs-script');
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'xlsx-script');
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf-script', () => {
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js', 'jspdf-autotable-script');
        });
        loadScript('https://sdk.mercadopago.com/js/v2', 'mercadopago-sdk');
    }, []);

    return (
        <AuthProvider>
            <NotificationProvider>
                <ConfirmationProvider>
                    <ShopProvider>
                        <AppContent deferredPrompt={deferredPrompt} />
                    </ShopProvider>
                </ConfirmationProvider>
            </NotificationProvider>
        </AuthProvider>
    );
}
