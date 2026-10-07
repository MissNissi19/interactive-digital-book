import type { Schema, Struct } from '@strapi/strapi';

export interface DrillKeyword extends Struct.ComponentSchema {
  collectionName: 'components_drill_keywords';
  info: {
    description: 'Required keyword in readback';
    displayName: 'Keyword';
    icon: 'key';
  };
  attributes: {
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface QuizOption extends Struct.ComponentSchema {
  collectionName: 'components_quiz_options';
  info: {
    description: 'Quiz answer option';
    displayName: 'Option';
    icon: 'check-circle';
  };
  attributes: {
    isCorrect: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    text: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface TranscriptLine extends Struct.ComponentSchema {
  collectionName: 'components_transcript_lines';
  info: {
    description: 'Radio transcript line';
    displayName: 'Line';
    icon: 'comment-alt';
  };
  attributes: {
    role: Schema.Attribute.Enumeration<['pilot', 'tower', 'info', 'action']> &
      Schema.Attribute.Required;
    text: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface TranscriptNote extends Struct.ComponentSchema {
  collectionName: 'components_transcript_notes';
  info: {
    description: 'Scenario side note';
    displayName: 'Note';
    icon: 'sticky-note';
  };
  attributes: {
    text: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'drill.keyword': DrillKeyword;
      'quiz.option': QuizOption;
      'transcript.line': TranscriptLine;
      'transcript.note': TranscriptNote;
    }
  }
}
