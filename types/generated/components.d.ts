import type { Schema, Struct } from '@strapi/strapi';

export interface ChatMessage extends Struct.ComponentSchema {
  collectionName: 'components_chat_messages';
  info: {
    description: 'Chat message component';
    displayName: 'Message';
  };
  attributes: {
    attachment: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
    content: Schema.Attribute.Text & Schema.Attribute.Required;
    isRead: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    sender: Schema.Attribute.Enumeration<['customer', 'restaurant', 'admin']> &
      Schema.Attribute.Required;
    timestamp: Schema.Attribute.DateTime & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'chat.message': ChatMessage;
    }
  }
}
