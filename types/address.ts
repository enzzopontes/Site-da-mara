export interface AddressCoordinates {
  lat: number;
  lng: number;
}

export interface AddressComponents {
  route: string;
  streetNumber: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface AddressPayload {
  formattedAddress: string;
  coordinates: AddressCoordinates;
  components: AddressComponents;
  number: string;
  complement?: string;
  reference?: string;
  placeId?: string;
}

export interface MapAddressPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (address: AddressPayload) => void;
  apiKey?: string;
  defaultCenter?: AddressCoordinates;
  defaultZoom?: number;
}
