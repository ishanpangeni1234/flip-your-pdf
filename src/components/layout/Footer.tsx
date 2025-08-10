export const Footer = () => {
  return (
    <footer className="py-8 mt-12 border-t bg-background/50">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Flip Your PDF. All Rights Reserved.</p>
      </div>
    </footer>
  );
};