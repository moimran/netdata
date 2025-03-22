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
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { SharedTableComponent } from '../tables/SharedTableComponent';
import type { TableName } from '../../types';

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

export function IPAMView({ tableName }: IPAMViewProps) {
  return <SharedTableComponent tableName={tableName} />;
}
