
export interface ProjectGroupStructureHdr {
  id: number;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  projectGroupStructureDtls?: ProjectGroupStructureDtl[];
}

export interface ProjectGroupStructureDtl {
  id: number;
  sequence: number;
  name: string;
  icon?: string;
  iconColor?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}
