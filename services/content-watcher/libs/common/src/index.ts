export interface LocationDto {
  name: string;
  accuracy?: number;
  altitude?: number;
  longitude?: number;
  radius?: number;
  units?: 'cm' | 'm' | 'km' | 'inches' | 'feet' | 'miles';
}
