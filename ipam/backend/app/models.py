class Prefix(SQLModel, table=True):
    # ...existing fields...
    __unique_fields__ = ['prefix', 'vrf_id']  # This combination should be unique
