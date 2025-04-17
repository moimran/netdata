import { useState } from 'react';
import {
  Group,
  Button,
  TextInput,
  Select,
  Modal,
  Stack,
  Text,
  Badge,
  Card,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { SharedTableComponent } from '../tables/SharedTableComponent';
import TableContainer from '../tables/TableContainer';
import type { TableName } from '../../types';
import '../IPAMTable/mrt-fixes.css'; // Import styling fixes

interface Prefix {
  id: number;
  prefix: string;
  vrf_id: number | null;
  status: string;
  description: string | null;
}

interface VRF {
  id: number;
  name: string;
  rd: string;
}

interface IPAMViewProps {
  tableName: TableName;
}

/**
 * IPAMView - A consistent wrapper component for tables
 * Provides consistent styling and layout for all table views
 */
export function IPAMView({ tableName }: IPAMViewProps) {
  // Format table name for display (from kebab or snake case to Title Case)
  const formattedTitle = tableName
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <TableContainer title={formattedTitle}>
      <SharedTableComponent tableName={tableName} />
    </TableContainer>
  );
}
