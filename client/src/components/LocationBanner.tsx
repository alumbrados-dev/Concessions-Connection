interface LocationBannerProps {
  message: string;
}

export default function LocationBanner({ message }: LocationBannerProps) {
  return (
    <div className="bg-accent text-accent-foreground p-4 text-center">
      <p className="font-medium" data-testid="text-location-message">
        <i className="fas fa-map-marker-alt mr-2"></i>
        {message}
      </p>
    </div>
  );
}
