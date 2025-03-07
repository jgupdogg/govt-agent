// src/components/dashboard/ActivityTable.tsx
import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Box, Typography, CircularProgress } from '@mui/material';
import { WhaleNotification } from '../../services/SnowflakeClient';

interface ActivityTableProps {
  data: WhaleNotification[];
  loading: boolean;
  error: string | null;
  textColor: string;
  secondaryTextColor: string;
}

const ActivityTable: React.FC<ActivityTableProps> = ({ 
  data, 
  loading, 
  error, 
  textColor, 
  secondaryTextColor 
}) => {
  // Function to format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Function to truncate addresses
  const truncateAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" className="text-center my-4">
        {error}
      </Typography>
    );
  }

  if (data.length === 0) {
    return (
      <Typography className={`text-center my-4 ${secondaryTextColor}`}>
        No activity data available.
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper} className="bg-transparent shadow-none">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell className={textColor}>Time</TableCell>
            <TableCell className={textColor}>Token</TableCell>
            <TableCell className={textColor}>Symbol</TableCell>
            <TableCell className={textColor}>Address</TableCell>
            <TableCell className={textColor}>Interval</TableCell>
            <TableCell className={textColor}>Buyers</TableCell>
            <TableCell className={textColor}>Sellers</TableCell>
            <TableCell className={textColor}>Net</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((notification) => {
            const netActivity = notification.NUM_USERS_BOUGHT - notification.NUM_USERS_SOLD;
            const netColor = netActivity > 0 ? 'success' : netActivity < 0 ? 'error' : 'default';
            
            return (
              <TableRow key={notification.NOTIFICATION_ID} hover>
                <TableCell className={secondaryTextColor}>
                  {formatTimestamp(notification.TIMESTAMP)}
                </TableCell>
                <TableCell className={textColor}>{notification.NAME}</TableCell>
                <TableCell className={textColor}>{notification.SYMBOL}</TableCell>
                <TableCell className={secondaryTextColor}>
                  {truncateAddress(notification.ADDRESS)}
                </TableCell>
                <TableCell className={secondaryTextColor}>{notification.TIME_INTERVAL}</TableCell>
                <TableCell className={textColor}>{notification.NUM_USERS_BOUGHT}</TableCell>
                <TableCell className={textColor}>{notification.NUM_USERS_SOLD}</TableCell>
                <TableCell>
                  <Chip 
                    label={netActivity > 0 ? `+${netActivity}` : netActivity} 
                    color={netColor}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ActivityTable;