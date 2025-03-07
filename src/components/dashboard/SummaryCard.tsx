// src/components/dashboard/SummaryCard.tsx
import React from 'react';
import { Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';

interface SummaryCardProps {
  title: string;
  value: number | string | null;
  icon?: React.ReactNode;
  loading?: boolean;
  className?: string;
  textColor?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ 
  title, 
  value, 
  icon, 
  loading = false, 
  className = '',
  textColor = ''
}) => {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ translateY: -5 }}
    >
      <Card className={`h-full shadow-lg ${className}`}>
        <CardContent className="p-6">
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="h6" className={textColor}>
                {title}
              </Typography>
              <Typography variant="h3" className={`mt-2 ${textColor}`}>
                {loading ? <CircularProgress size={24} /> : value}
              </Typography>
            </Box>
            {icon && (
              <Box className="text-4xl opacity-80">
                {icon}
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SummaryCard;