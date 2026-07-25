from sqlalchemy import Column, Integer, String
from database import Base


class User(Base):

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)

    email = Column(String, unique=True, index=True, nullable=False)

    password = Column(String, nullable=False)

    phone = Column(String, default="")

    state = Column(String, default="")

    district = Column(String, default="")

    city = Column(String, default="")

    language = Column(String, default="English")

    farmer_type = Column(String, default="")

    crop = Column(String, default="")

    farm_size = Column(String, default="")

    soil_type = Column(String, default="")