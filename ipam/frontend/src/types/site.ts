export interface Site {
  id: number;
  name: string;
  slug: string;
  status: string;
  region_id?: number;
  site_group_id?: number;
  created_at: string;
}

export interface CreateSiteData {
  name: string;
  slug: string;
  status: string;
  region_id?: number;
  site_group_id?: number;
}

export interface UpdateSiteData extends Partial<CreateSiteData> {}
