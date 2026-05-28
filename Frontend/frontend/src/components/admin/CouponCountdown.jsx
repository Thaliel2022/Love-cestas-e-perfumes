import React, { useState, useEffect } from 'react';

export const CouponCountdown = ({ createdAt, validityDays }) => {
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
