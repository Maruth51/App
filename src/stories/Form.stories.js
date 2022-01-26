import React from 'react';
import TextInput from '../components/TextInput';
import Form from '../components/Form';
import * as FormActions from '../libs/actions/FormActions';

/**
 * We use the Component Story Format for writing stories. Follow the docs here:
 *
 * https://storybook.js.org/docs/react/writing-stories/introduction#component-story-format
 */
const story = {
    title: 'Components/Form',
    component: Form,
    subcomponents: {TextInput},
};

const Template = (args) => {
    FormActions.setIsSubmitting(args.formID, args.formState.isSubmitting);
    FormActions.setServerErrorMessage(args.formID, args.formState.serverErrorMessage);
    FormActions.setDraftValues(args.formID, args.draftValues);

    return (
        // eslint-disable-next-line react/jsx-props-no-spreading
        <Form {...args}>
            <TextInput
                label="Routing number"
                inputID="routingNumber"
                isFormInput
                shouldSaveDraft
            />
            <TextInput
                label="Account number"
                inputID="accountNumber"
                isFormInput
            />
        </Form>
    );
};

// Arguments can be passed to the component by binding
// See: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Default = Template.bind({});
const Loading = Template.bind({});
const ServerError = Template.bind({});
const InputError = Template.bind({});

const defaultArgs = {
    formID: 'TestForm',
    submitButtonText: 'Submit',
    validate: (values) => {
        const errors = {};
        if (!values.routingNumber) {
            errors.routingNumber = 'Please enter a routing number';
        }
        if (!values.accountNumber) {
            errors.accountNumber = 'Please enter an account number';
        }
        return errors;
    },
    onSubmit: (values) => {
        setTimeout(() => {
            alert(`Form submitted!\n\nInput values: ${JSON.stringify(values, null, 4)}`)
            FormActions.setIsSubmitting('TestForm', false)
        }, 1000);
    },
    formState: {
        isSubmitting: false,
        serverErrorMessage: '',
    },
    draftValues: {
        routingNumber: '00001',
        accountNumber: '1111222233331111',
    },
};

Default.args = defaultArgs;
Loading.args = {...defaultArgs, formState: {isSubmitting: true}};
ServerError.args = {...defaultArgs, formState: {serverErrorMessage: 'There was an unexpected error. Please try again later.'}};
InputError.args = {...defaultArgs, draftValues: {}};

export default story;
export {
    Default,
    Loading,
    ServerError,
    InputError,
};
