import { map } from 'rxjs/operators';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { TranslateService } from '@ngx-translate/core';

export function getValidationMessages(translate: TranslateService) {
  return [
    {
      name: 'required',
      message(err: any, field: FormlyFieldConfig) {
        return translate.stream('FORM.VALIDATION.REQUIRED').pipe(
          map(msg => msg.replaceAll('{{label}}', field.props?.label || 'This field'))
        );
      },
    },
    {
      name: 'minLength',
      message(err: any, field: FormlyFieldConfig) {
        return translate.stream('FORM.VALIDATION.MIN_LENGTH').pipe(
          map(msg =>
            msg
              .replaceAll('{{label}}', field.props?.label || 'This field')
              .replaceAll('{{minLength}}', field.props?.minLength || err.requiredLength)
          )
        );
      },
    },
    {
      name: 'maxLength',
      message(err: any, field: FormlyFieldConfig) {
        return translate.stream('FORM.VALIDATION.MAX_LENGTH').pipe(
          map(msg =>
            msg
              .replaceAll('{{label}}', field.props?.label || 'This field')
              .replaceAll('{{maxLength}}', field.props?.maxLength || err.requiredLength)
          )
        );
      },
    },
    {
      name: 'min',
      message(err: any, field: FormlyFieldConfig) {
        return translate.stream('FORM.VALIDATION.MIN').pipe(
          map(msg =>
            msg
              .replaceAll('{{label}}', field.props?.label || 'This field')
              .replaceAll('{{min}}', field.props?.min || err.min)
          )
        );
      },
    },
    {
      name: 'max',
      message(err: any, field: FormlyFieldConfig) {
        return translate.stream('FORM.VALIDATION.MAX').pipe(
          map(msg =>
            msg
              .replaceAll('{{label}}', field.props?.label || 'This field')
              .replaceAll('{{max}}', field.props?.max || err.max)
          )
        );
      },
    },
    {
      name: 'multipleOf',
      message(err: any, field: FormlyFieldConfig) {
        return translate.stream('FORM.VALIDATION.MULTIPLE_OF').pipe(
          map(msg =>
            msg
              .replaceAll('{{label}}', field.props?.label || 'This field')
              .replaceAll('{{step}}', field.props?.step || err.multipleOf)
          )
        );
      },
    },
    {
      name: 'exclusiveMinimum',
      message(err: any, field: FormlyFieldConfig) {
        return translate.stream('FORM.VALIDATION.EXCLUSIVE_MINIMUM').pipe(
          map(msg =>
            msg
              .replaceAll('{{label}}', field.props?.label || 'This field')
              .replaceAll('{{step}}', field.props?.step || err.min)
          )
        );
      },
    },
    {
      name: 'exclusiveMaximum',
      message(err: any, field: FormlyFieldConfig) {
        return translate.stream('FORM.VALIDATION.EXCLUSIVE_MAXIMUM').pipe(
          map(msg =>
            msg
              .replaceAll('{{label}}', field.props?.label || 'This field')
              .replaceAll('{{step}}', field.props?.step || err.max)
          )
        );
      },
    },
    {
      name: 'uniqueItems',
      message(err: any, field: FormlyFieldConfig) {
        return translate.stream('FORM.VALIDATION.UNIQUE_ITEMS').pipe(
          map(msg => msg.replaceAll('{{label}}', field.props?.label || 'This field'))
        );
      },
    },
    {
      name: 'pattern',
      message(err: any, field: any) {
        if(field.props?.customMessage){
          return translate.stream(field.props.messageName)
        }
        else{
        return translate.stream('FORM.VALIDATION.PATTERN').pipe(
          map(msg => msg.replaceAll('{{label}}', field.props?.label || 'This field'))
        );}
      },
    },
  ];
}
