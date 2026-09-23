import { FormControl, FormGroup } from '@angular/forms';
import { NamedReference } from '../../shared/models/booking-report';

export interface Court {
  publicId: string;
  courtNameEn: string;
  courtNameAr: string;
  branch: NamedReference;
  sport: NamedReference;
  isIndoor: boolean;
  isActive: boolean;
}

export interface CourtPrice {
  durationMins: number;
  price: number;
}

export interface CourtDetails extends Court {
  prices: CourtPrice[];
}

export interface CourtOptions {
  branches: NamedReference[];
  sports: NamedReference[];
}

export interface CourtList {
  items: Court[];
  availableFilters: CourtOptions;
}

export interface CourtFilters {
  branchPublicId: string;
  sportPublicId: string;
  isIndoor: string;
  isActive: string;
}

export type CourtFilterForm = FormGroup<{ [Key in keyof CourtFilters]: FormControl<string> }>;

export interface CreateCourt {
  courtNameEn: string;
  courtNameAr: string;
  branchPublicId: string;
  sportPublicId: string;
  isIndoor: boolean;
  prices: CourtPrice[];
}

export interface UpdateCourt extends Omit<CreateCourt, 'branchPublicId'> {
  isActive: boolean;
}

export interface CourtPopupData {
  publicId?: string;
  options: CourtOptions;
}
