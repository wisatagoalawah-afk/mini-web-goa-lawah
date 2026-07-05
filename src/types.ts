export interface RentalPrices {
  tent: number;        // Tenda
  sleepingBag: number; // Sleeping Bag
  matras: number;      // Matras
  firewood: number;    // Kayu Bakar
  [key: string]: number;
}

export interface AdminSettings {
  youtubeUrl: string;
  whatsappUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  googleMapsUrl: string;
  ticketInfoImage: string;
  campingImage: string;
  paymentImage: string;
  logoUrl: string;
  
  // Ticket pricings
  priceCampingPerson: number;
  priceCampingMotorcycle: number;
  priceCampingCar: number;
  
  priceVisitPerson: number;
  priceVisitMotorcycle: number;
  priceVisitCar: number;
  
  rentalPrices: RentalPrices;
  eTicketActive?: boolean;
  disableSupabaseSync?: boolean;
  gmailAutoReplyActive?: boolean;
  gmailToken?: string | null;

  // Custom Form & Rental configurations
  rentalItems?: { id: string; name: string; price: number }[];
  formFields?: { id: string; label: string; placeholder: string; type: string; required: boolean; isDefault?: boolean }[];
  
  // Custom text contents of the main page to enable admin control
  contentTexts: {
    heroTitle: string;
    heroSubtitle: string;
    description: string;
    destinationName: string;
    villageName: string;
    footerText: string;
    action1Label?: string;
    action1Title?: string;
    action2Title?: string;
    action2Subtitle?: string;
    action3Title?: string;
    action3Subtitle?: string;
    action4Title?: string;
    action4Subtitle?: string;
    action5Title?: string;
    action5Subtitle?: string;
    action6Title?: string;
    action6Subtitle?: string;
    mapsTitle?: string;
    feedbackTitle?: string;
    feedbackPlacName?: string;
    feedbackPlacMsg?: string;
    feedbackBtn?: string;
    feedbackSuccessMsg?: string;
    socmedTitle?: string;
    footerHeart?: string;
  };
}

export interface Booking {
  id: string;
  name: string;
  whatsapp: string;
  email: string;
  visitType: "camping" | "visit";
  checkInDate: string;
  checkOutDate?: string; // Only for camping
  numNights?: number;    // Only for camping
  numPeople: number;
  numMotorcycles: number;
  numCars: number;
  rentals?: {
    tent: number;
    sleepingBag: number;
    matras: number;
    firewood: number;
    [key: string]: number;
  };
  paymentMethod: "tunai" | "qris";
  totalPrice: number;
  bookingCode: string;
  createdAt: string;
  paymentStatus?: "Belum Bayar" | "Lunas" | "Menunggu Validasi";
}

export interface Feedback {
  id: string;
  name?: string;
  message: string;
  createdAt: string;
}

export interface VisitorStats {
  viewsCount: { [date: string]: number }; // logs date: count
  totalViews: number;
  totalBookings: number;
  totalRevenue: number;
}

export interface AdminUser {
  id: string;
  username: string;
  role: "superadmin" | "admin";
  createdAt: string;
}
