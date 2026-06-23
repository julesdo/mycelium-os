export type FleetSummaryWidget = {
	widget: 'fleet_summary';
	fleet: { total: number; available: number; inUse: number; maintenance: number };
	reservations: { activeTotal: number; todayActive: number; thisWeekTotal: number };
};

export type FleetUtilizationWidget = {
	widget: 'fleet_utilization';
	period: string;
	periodDays: number;
	avgUtilizationRate: number;
	totalVehicles: number;
	vehicles: Array<{
		label: string;
		registration: string;
		utilizationRate: number;
		reservationCount: number;
	}>;
};

export type CostBreakdownWidget = {
	widget: 'cost_breakdown';
	period: string;
	total: number;
	byCategory?: Array<{ category: string; amount: number; percentage: number }>;
	byVehicle?: Array<{ vehicleLabel: string; total: number; percentage: number }>;
};

export type ReservationActivityWidget = {
	widget: 'reservation_activity';
	period: string;
	total: number;
	breakdown: Array<{ label?: string; status?: string; count: number }>;
};

export type MaintenanceOverviewWidget = {
	widget: 'maintenance_overview';
	summary: { totalScheduled: number; totalCompleted: number; totalCostCompleted: number };
	upcoming: Array<{ vehicle: string; type: string; scheduledDate: string; costEstimate?: number | null }>;
	overdue: Array<{ vehicle: string; type: string; scheduledDate: string; daysOverdue: number }>;
};

export type ComplianceStatusWidget = {
	widget: 'compliance_status';
	daysAhead: number;
	leaseExpired: Array<{ label: string; leaseEndDate: string; daysOverdue: number }>;
	leaseExpiring: Array<{ label: string; leaseEndDate: string; daysLeft: number }>;
	maintenanceDue: Array<{ label: string; maintenanceDueDate: string; isOverdue: boolean; daysLeft: number }>;
};

export type VehicleProposalWidget = {
	widget: 'vehicle_proposal';
	vehicle: {
		id: string;
		brand: string;
		model: string;
		registration: string;
		year?: number;
		label: string;
		category: 'PASSENGER' | 'UTILITY' | 'TRUCK';
		energy: 'THERMAL' | 'HYBRID' | 'ELECTRIC';
		location: string | null;
	};
	totalFound: number;
	startDate?: string;
	endDate?: string;
};

export type ReservationConfirmedWidget = {
	widget: 'reservation_confirmed';
	reservation: { id: string; vehicle: string; startDate: string; endDate: string; status: string };
};

export type CopilotWidget =
	| FleetSummaryWidget
	| FleetUtilizationWidget
	| CostBreakdownWidget
	| ReservationActivityWidget
	| MaintenanceOverviewWidget
	| ComplianceStatusWidget
	| VehicleProposalWidget
	| ReservationConfirmedWidget;
