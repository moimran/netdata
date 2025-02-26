import sys
import os

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, create_engine
from app.models import RIR, ASNRange

# Database connection
DATABASE_URL = "postgresql://postgres:moimran@123@127.0.0.1:5432/ipam"
engine = create_engine(DATABASE_URL)

def test_relationships():
    with Session(engine) as session:
        # Create a RIR
        rir = RIR(
            name="Test RIR",
            slug="test-rir",
            description="Test RIR Description"
        )
        
        # Create an ASN Range
        asn_range = ASNRange(
            start=64512,
            end=65534,
            rir=rir
        )
        
        print("Created RIR and ASNRange objects")
        print(f"RIR: {rir.name}")
        print(f"ASN Range: {asn_range.range_as_string()}")
        print(f"ASN Range's RIR: {asn_range.rir.name}")
        print(f"RIR's ASN Ranges: {[r.range_as_string() for r in rir.asn_ranges]}")

if __name__ == "__main__":
    test_relationships()
