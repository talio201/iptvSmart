from src.models.user import db
from datetime import datetime
import json

class XtreamConnection(db.Model):
    __tablename__ = 'xtream_connections'
    
    id = db.Column(db.Integer, primary_key=True)
    server_url = db.Column(db.String(255), nullable=False)
    username = db.Column(db.String(100), nullable=False)
    password = db.Column(db.String(100), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_used = db.Column(db.DateTime, default=datetime.utcnow)
    last_synced_at = db.Column(db.DateTime, nullable=True)
    
    # Informações do servidor
    server_info = db.Column(db.Text)  # JSON string
    user_info = db.Column(db.Text)   # JSON string
    
    def set_server_info(self, info_dict):
        self.server_info = json.dumps(info_dict)
    
    def get_server_info(self):
        try:
            return json.loads(self.server_info) if self.server_info else {}
        except json.JSONDecodeError:
            return {}
    
    def set_user_info(self, info_dict):
        self.user_info = json.dumps(info_dict)
    
    def get_user_info(self):
        try:
            return json.loads(self.user_info) if self.user_info else {}
        except json.JSONDecodeError:
            return {}

class Category(db.Model):
    __tablename__ = 'categories'
    
    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.String(50), nullable=False)
    category_name = db.Column(db.String(255), nullable=False)
    parent_id = db.Column(db.Integer, nullable=True)
    stream_type = db.Column(db.String(50), nullable=False) # New field: live, movie, series
    connection_id = db.Column(db.Integer, db.ForeignKey('xtream_connections.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Channel(db.Model):
    __tablename__ = 'channels'
    
    id = db.Column(db.Integer, primary_key=True)
    stream_id = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    stream_type = db.Column(db.String(50), nullable=False)  # live, movie, series
    stream_icon = db.Column(db.String(500))
    epg_channel_id = db.Column(db.String(100))
    added = db.Column(db.String(50))
    category_id = db.Column(db.String(50))
    custom_sid = db.Column(db.String(50))
    tv_archive = db.Column(db.Integer, default=0)
    direct_source = db.Column(db.String(500))
    tv_archive_duration = db.Column(db.Integer, default=0)
    connection_id = db.Column(db.Integer, db.ForeignKey('xtream_connections.id'), nullable=False)
    
    # Informações adicionais
    extra_info = db.Column(db.Text)  # JSON string para informações extras
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def set_extra_info(self, info_dict):
        self.extra_info = json.dumps(info_dict)
    
    def get_extra_info(self):
        try:
            return json.loads(self.extra_info) if self.extra_info else {}
        except json.JSONDecodeError:
            return {}

class EPGProgram(db.Model):
    __tablename__ = 'epg_programs'
    
    id = db.Column(db.Integer, primary_key=True)
    epg_id = db.Column(db.String(100), nullable=False)
    channel_id = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    lang = db.Column(db.String(10))
    connection_id = db.Column(db.Integer, db.ForeignKey('xtream_connections.id'), nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class UserPreferences(db.Model):
    __tablename__ = 'user_preferences'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(100), nullable=False, default='default')
    favorite_channels = db.Column(db.Text)  # JSON array de stream_ids
    recent_channels = db.Column(db.Text)    # JSON array de stream_ids
    quality_preference = db.Column(db.String(20), default='auto')  # auto, 4k, fullhd, hd, sd
    volume_level = db.Column(db.Float, default=1.0)
    subtitle_enabled = db.Column(db.Boolean, default=False)
    subtitle_language = db.Column(db.String(10), default='pt')
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def set_favorite_channels(self, channels_list):
        self.favorite_channels = json.dumps(channels_list)
    
    def get_favorite_channels(self):
        try:
            return json.loads(self.favorite_channels) if self.favorite_channels else []
        except json.JSONDecodeError:
            return []
    
    def set_recent_channels(self, channels_list):
        self.recent_channels = json.dumps(channels_list)
    
    def get_recent_channels(self):
        try:
            return json.loads(self.recent_channels) if self.recent_channels else []
        except json.JSONDecodeError:
            return []

