export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type MaintenanceType = 'REVISION' | 'VIDANGE' | 'PNEUS' | 'FREINS' | 'AUTRE';

export interface MaintenanceRecord {
	id: string;
	vehicleRegistration: string;
	vehicleBrand: string;
	vehicleModel: string;
	type: MaintenanceType;
	scheduledDate: string;
	garage: string;
	costEstimate: number;
	status: MaintenanceStatus;
	notes?: string;
}

export const TYPE_LABELS: Record<MaintenanceType, string> = {
	REVISION: 'Révision',
	VIDANGE: 'Vidange',
	PNEUS: 'Pneumatiques',
	FREINS: 'Freins',
	AUTRE: 'Autre'
};
