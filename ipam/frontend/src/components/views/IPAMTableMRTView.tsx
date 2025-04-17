import { Card, Title } from '@mantine/core';
import IPAMTableMRT from '../IPAMTable/IPAMTableMRT';
import type { TableName } from '../../types';

interface IPAMTableMRTViewProps {
    tableName: TableName;
}

export function IPAMTableMRTView({ tableName }: IPAMTableMRTViewProps) {
    return (
        <Card p="md" radius="md" withBorder>
            <Title order={4} mb="md">Mantine React Table Implementation</Title>
            <IPAMTableMRT tableName={tableName} />
        </Card>
    );
}

export default IPAMTableMRTView; 