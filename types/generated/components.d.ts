import type { Schema, Struct } from '@strapi/strapi';

export interface ProductTypesKomodi extends Struct.ComponentSchema {
  collectionName: 'components_product_types_komodis';
  info: {
    displayName: 'komodi';
  };
  attributes: {
    body_material: Schema.Attribute.Component<'shared.options', true>;
    depth: Schema.Attribute.Integer;
    front_materials: Schema.Attribute.Component<'shared.options', true>;
    furniture_description: Schema.Attribute.Text;
    height: Schema.Attribute.Integer;
    images: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    >;
    model_name: Schema.Attribute.String;
    price: Schema.Attribute.Decimal;
    size_option: Schema.Attribute.Component<'shared.size-option', true>;
    width: Schema.Attribute.Integer;
  };
}

export interface SharedMedia extends Struct.ComponentSchema {
  collectionName: 'components_shared_media';
  info: {
    displayName: 'Media';
    icon: 'file-video';
  };
  attributes: {
    file: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
  };
}

export interface SharedOptions extends Struct.ComponentSchema {
  collectionName: 'components_shared_options';
  info: {
    displayName: 'Options';
    icon: 'alien';
  };
  attributes: {
    img: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    title: Schema.Attribute.String;
  };
}

export interface SharedQuote extends Struct.ComponentSchema {
  collectionName: 'components_shared_quotes';
  info: {
    displayName: 'Quote';
    icon: 'indent';
  };
  attributes: {
    body: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface SharedRichText extends Struct.ComponentSchema {
  collectionName: 'components_shared_rich_texts';
  info: {
    description: '';
    displayName: 'Rich text';
    icon: 'align-justify';
  };
  attributes: {
    body: Schema.Attribute.RichText;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: '';
    displayName: 'Seo';
    icon: 'allergies';
    name: 'Seo';
  };
  attributes: {
    metaDescription: Schema.Attribute.Text & Schema.Attribute.Required;
    metaTitle: Schema.Attribute.String & Schema.Attribute.Required;
    shareImage: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedSizeOption extends Struct.ComponentSchema {
  collectionName: 'components_shared_size_options';
  info: {
    displayName: 'size_option';
    icon: 'database';
  };
  attributes: {
    depth: Schema.Attribute.Integer;
    height: Schema.Attribute.Integer;
    price: Schema.Attribute.Integer;
    width: Schema.Attribute.Integer;
  };
}

export interface SharedSlider extends Struct.ComponentSchema {
  collectionName: 'components_shared_sliders';
  info: {
    description: '';
    displayName: 'Slider';
    icon: 'address-book';
  };
  attributes: {
    files: Schema.Attribute.Media<'images', true>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'product-types.komodi': ProductTypesKomodi;
      'shared.media': SharedMedia;
      'shared.options': SharedOptions;
      'shared.quote': SharedQuote;
      'shared.rich-text': SharedRichText;
      'shared.seo': SharedSeo;
      'shared.size-option': SharedSizeOption;
      'shared.slider': SharedSlider;
    }
  }
}
