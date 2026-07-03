import { FormlyExtension, FormlyFieldConfig } from '@ngx-formly/core';
import { TranslateService } from '@ngx-translate/core';
import { getValidationMessages } from '../validation/message';
import { environment } from '../../../../environments/environment';

export class TranslateExtension implements FormlyExtension {
  constructor(private translate: TranslateService) {}

  prePopulate(field: FormlyFieldConfig) {
    const props: any = field.props || {};
    
    const hasTranslateProp = props.translate !== undefined || props.transalte !== undefined || props.transale !== undefined;
    const isTranslateEnabled = props.translate || props.transalte || props.transale;

    // Auto-enable translate if environment.transalte is true
    if (environment.transalte && !hasTranslateProp) {
      props.translate = true;
    }

    if (!(props.translate || props.transalte || props.transale) || props._translated) {
      return;
    }

    if (field.validation && field.validation.messages) {
      for (const key of Object.keys(field.validation.messages)) {
        const msgVal = field.validation.messages[key];
        if (typeof msgVal === 'string') {
          field.validation.messages[key] = (err: any, fieldConfig: FormlyFieldConfig) => {
            return this.translate.stream(msgVal);
          };
        }
      }
    }

    props._translated = true;
    field.expressions = {
      ...(field.expressions || {}),
      ...(props.label && { 'props.label': this.translate.stream(props.label) }),
      ...(props.placeholder && { 'props.placeholder': this.translate.stream(props.placeholder) }),
    };
  }
}

export function registerTranslateExtension(translate: TranslateService) {
  return {
    validationMessages:getValidationMessages(translate)  ,
    extensions: [
      {
        name: 'translate',
        extension: new TranslateExtension(translate),
      },
    ],
  };
}