import React, { Component } from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import Moment from 'moment';
import classnames from 'classnames';
import { List as ImmutableList } from 'immutable';

import { RawWidgetPropTypes, RawWidgetDefaultProps } from './PropTypes';
// import { getClassNames, generateMomentObj } from '../../utils/widgetHelpers';
import { DATE_TIMEZONE_FORMAT } from '../../constants/Constants';

import WidgetRenderer from './WidgetRenderer';
import DevicesWidget from './Devices/DevicesWidget';
import Tooltips from '../tooltips/Tooltips';

/**
 * @file Class based component.
 * @module RawWidget
 * @extends Component
 */
export class RawWidget extends Component {
  constructor(props) {
    super(props);

    const { widgetData } = props;
    // TODO: We should use `null` instead
    let cachedValue = undefined;

    if (widgetData && widgetData[0]) {
      if (widgetData[0].value !== undefined) {
        cachedValue = widgetData[0].value;
      } else if (
        widgetData[0].status &&
        widgetData[0].status.value !== undefined
      ) {
        cachedValue = widgetData[0].status.value;
      }
    }

    this.state = {
      isFocused: false,
      cachedValue,
      errorPopup: false,
      tooltipToggled: false,
      clearedFieldWarning: false,
    };

    // this.getClassNames = getClassNames.bind(this);
    // this.generateMomentObj = generateMomentObj.bind(this);
  }

  componentDidMount() {
    const { autoFocus, textSelected } = this.props;
    const { rawWidget } = this;

    if (rawWidget && autoFocus) {
      rawWidget.focus();
    }

    if (textSelected) {
      rawWidget.select();
    }
  }

  // in some cases we initially have no widgetData when RawWidgets are created
  // (Selection attributes) so we have to update the `cachedValue` to the
  // value from widgetData, once it's available
  static getDerivedStateFromProps(props, state) {
    if (
      typeof state.cachedValue === 'undefined' &&
      props.widgetData &&
      props.widgetData[0]
    ) {
      let cachedValue = undefined;
      if (props.widgetData[0].value !== undefined) {
        cachedValue = props.widgetData[0].value;
      } else if (
        props.widgetData[0].status &&
        props.widgetData[0].status.value !== undefined
      ) {
        cachedValue = props.widgetData[0].status.value;
      }

      return {
        cachedValue,
      };
    }

    return null;
  }

  setRef = (ref) => {
    this.rawWidget = ref;
  };

  /**
   * @method focus
   * @summary Function used specifically for list widgets. It blocks outside clicks, which are
   * then enabled again in handleBlur. This is to avoid closing the list as it's a separate
   * DOM element outside of it's parent's tree.
   */
  focus = () => {
    const { handleFocus, disableOnClickOutside } = this.props;
    const { rawWidget } = this;

    if (rawWidget && rawWidget.focus) {
      rawWidget.focus();
    }

    disableOnClickOutside && disableOnClickOutside();
    handleFocus && handleFocus();
  };

  /**
   * @method handleFocus
   * @summary ToDo: Describe the method.
   * @param {*} e
   */
  handleFocus = () => {
    const {
      handleFocus,
      listenOnKeysFalse,
      disableShortcut,
      widgetType,
    } = this.props;

    widgetType === 'LongText' && disableShortcut(); // fix issue in Cypress with cut underscores - false positive failing tests
    // - commented because if you focus on an item and you disable the shourtcuts you won't be able to use any shortcut
    //   assigned to that specific item/widget - see issue https://github.com/metasfresh/metasfresh/issues/7119
    listenOnKeysFalse && listenOnKeysFalse();

    setTimeout(() => {
      this.setState(
        {
          isFocused: true,
        },
        () => {
          handleFocus && handleFocus();
        }
      );
    }, 0);
  };

  /**
   * @method handleBlurWithParams
   * @summary on blurring the widget field enable shortcuts/key event listeners
   * and patch the field if necessary
   *
   * @param {*} widgetField
   * @param {*} value
   * @param {*} id
   */
  handleBlurWithParams = (widgetField, value, id) => {
    const {
      allowShortcut,
      handleBlur,
      listenOnKeysTrue,
      enableOnClickOutside,
    } = this.props;

    this.setState(
      {
        isFocused: false,
      },
      () => {
        enableOnClickOutside && enableOnClickOutside();
        allowShortcut();
        handleBlur && handleBlur(this.willPatch(widgetField, value));

        listenOnKeysTrue && listenOnKeysTrue();

        if (widgetField) {
          this.handlePatch(widgetField, value, id);
        }
      }
    );
  };

  /**
   * @method handleBlur
   * @summary Wrapper around `handleBlurWithParams` to grab the missing
   * parameters and avoid anonymous function in event handlers
   * @param {*} e - DOM event
   */
  handleBlur = (e) => {
    const { filterWidget, fields, id } = this.props;

    const value = e.target.value;
    const widgetField = filterWidget
      ? fields[0].parameterName
      : fields[0].field;

    this.handleBlurWithParams(widgetField, value, id);
  };

  /**
   * @method updateTypedCharacters
   * @summary updates in the state the number of charactes typed
   * @param {typedText} string
   */
  updateTypedCharacters = (typedText) => {
    const { fieldName } = this.props;
    let existingCharsTyped = { ...this.state.charsTyped };
    existingCharsTyped[fieldName] = typedText.length;
    this.setState({ charsTyped: existingCharsTyped });
    return true;
  };

  /**
   * @method handleKeyDown
   * @summary key handler for the widgets. For number fields we're suppressing up/down
   *          arrows to enable table row navigation
   * @param {*} e - DOM event
   */
  handleKeyDown = (e) => {
    const {
      lastFormField,
      widgetType,
      filterWidget,
      fields,
      closeTableField,
    } = this.props;
    const value = e.target.value;
    const { key } = e;
    const widgetField = filterWidget
      ? fields[0].parameterName
      : fields[0].field;

    this.updateTypedCharacters(e.target.value);

    // for number fields submit them automatically on up/down arrow pressed and blur the field
    const NumberWidgets = ImmutableList([
      'Integer',
      'Amount',
      'Quantity',
      'Number',
      'CostPrice',
    ]);
    if (
      (key === 'ArrowUp' || key === 'ArrowDown') &&
      NumberWidgets.includes(widgetType)
    ) {
      closeTableField();
      e.preventDefault();

      this.handleBlur();

      return this.handlePatch(widgetField, value, null, null, true);
    }

    if ((key === 'Enter' || key === 'Tab') && !e.shiftKey) {
      if (key === 'Enter' && !lastFormField) {
        e.preventDefault();
      }
      return this.handlePatch(widgetField, value);
    }
  };

  /**
   * @method handleChange
   * @summary onChange event handler
   * @param {*} e - DOM event
   */
  handleChange = (e) => {
    const { handleChange, filterWidget, fields } = this.props;
    const widgetField = filterWidget
      ? fields[0].parameterName
      : fields[0].field;

    handleChange &&
      this.updateTypedCharacters(e.target.value) &&
      handleChange(widgetField, e.target.value);
  };

  /**
   * @method willPatch
   * @summary Checks if the value has actually changed between what was cached before.
   * @param {*} property
   * @param {*} value
   * @param {*} valueTo
   */
  willPatch = (property, value, valueTo) => {
    const { widgetData } = this.props;
    const { cachedValue } = this.state;

    // if there's no widget value, then nothing could've changed. Unless
    // it's a widget for actions (think ActionButton)
    const isValue =
      widgetData[0].value !== undefined ||
      (widgetData[0].status && widgetData[0].status.value !== undefined);
    let fieldData = widgetData.find((widget) => widget.field === property);
    if (!fieldData) {
      fieldData = widgetData[0];
    }

    let allowPatching =
      (isValue &&
        (JSON.stringify(fieldData.value) != JSON.stringify(value) ||
          JSON.stringify(fieldData.valueTo) != JSON.stringify(valueTo))) ||
      JSON.stringify(cachedValue) != JSON.stringify(value) ||
      // clear field that had it's cachedValue nulled before
      (cachedValue === null && value === null);

    if (cachedValue === undefined && !value) {
      allowPatching = false;
    }

    return allowPatching;
  };

  /**
   * @method handlePatch
   * @summary Method for handling the actual patching from the widget(input), which in turn
   *          calls the parent method (usually from MasterWidget) if the requirements are met
   *          (value changed and patching is not in progress). `isForce` will be used for Datepicker
   *          Datepicker is checking the cached value in datepicker component itself
   *          and send a patch request only if date is changed
   * @param {*} property
   * @param {*} value
   * @param {*} id
   * @param {*} valueTo
   * @param {*} isForce
   */
  handlePatch = (property, value, id, valueTo, isForce) => {
    const { handlePatch, inProgress, widgetType, maxLength } = this.props;
    const willPatch = this.willPatch(property, value, valueTo);

    if (widgetType === 'LongText' || widgetType === 'Text') {
      value = value.substring(0, maxLength);
      this.updateTypedCharacters(value);
    }

    // Do patch only when value is not equal state
    // or cache is set and it is not equal value
    if ((isForce || willPatch) && handlePatch && !inProgress) {
      if (widgetType === 'ZonedDateTime' && Moment.isMoment(value)) {
        value = Moment(value).format(DATE_TIMEZONE_FORMAT);
      }

      this.setState({
        cachedValue: value,
        clearedFieldWarning: false,
      });

      return handlePatch(property, value, id, valueTo);
    }

    return Promise.resolve(null);
  };

  /**
   * @method handleProcess
   * @summary ToDo: Describe the method.
   */
  handleProcess = () => {
    const {
      handleProcess,
      buttonProcessId,
      tabId,
      rowId,
      dataId,
      windowType,
      caption,
    } = this.props;

    handleProcess &&
      handleProcess(caption, buttonProcessId, tabId, rowId, dataId, windowType);
  };

  /**
   * @method showErrorPopup
   * @summary shows error message on mouse over
   */
  showErrorPopup = () => {
    this.setState({
      errorPopup: true,
    });
  };

  /**
   * @method hideErrorPopup
   * @summary hides error message on mouse out
   */
  hideErrorPopup = () => {
    this.setState({
      errorPopup: false,
    });
  };

  /**
   * @method clearFieldWarning
   * @summary ToDo: Describe the method.
   * @param {*} warning
   */
  clearFieldWarning = (warning) => {
    if (warning) {
      this.setState({
        clearedFieldWarning: true,
      });
    }
  };

  /**
   * @method toggleTooltip
   * @summary ToDo: Describe the method.
   * @param {*} show
   */
  toggleTooltip = (show) => {
    this.setState({
      tooltipToggled: show,
    });
  };

  /**
   * @method renderErrorPopup
   * @summary ToDo: Describe the method.
   * @param {*} reason
   */
  renderErrorPopup = (reason) => {
    return (
      <div className="input-error-popup">{reason ? reason : 'Input error'}</div>
    );
  };

  /**
   * @method renderWidget
   * @summary Renders a single widget
   */
  renderWidget = () => {
    const {
      modalVisible,
      isModal,
      filterWidget,
      id,
      fullScreen,
      fields,
      widgetData,
      data,
      defaultValue,
      fieldName,
      maxLength,
    } = this.props;
    let tabIndex = this.props.tabIndex;
    const { isFocused, charsTyped } = this.state;

    let widgetValue = data != null ? data : widgetData[0].value;
    if (widgetValue === null) {
      widgetValue = '';
    }

    // TODO: API SHOULD RETURN THE SAME PROPERTIES FOR FILTERS
    const widgetField = filterWidget
      ? fields[0].parameterName
      : fields[0].field;
    const readonly = widgetData[0].readonly;

    if (fullScreen || readonly || (modalVisible && !isModal)) {
      tabIndex = -1;
    }

    // TODO: this logic should be removed and adapted below after widgetType === 'MultiListValue' is added
    const isMultiselect =
      widgetData[0].widgetType === 'List' && widgetData[0].multiListValue
        ? true
        : false;
    // TODO:  ^^^^^^^^^^^^^

    const widgetProperties = {
      ref: this.setRef,
      //autocomplete=new-password did not work in chrome for non password fields anymore,
      //switched to autocomplete=off instead
      autoComplete: 'off',
      className: 'input-field js-input-field',
      value: widgetValue,
      defaultValue,
      placeholder: fields[0].emptyText,
      disabled: readonly,
      onFocus: this.handleFocus,
      tabIndex: tabIndex,
      onChange: this.handleChange,
      onBlur: this.handleBlur,
      onKeyDown: this.handleKeyDown,
      title: widgetValue,
      id,
    };
    const showErrorBorder = charsTyped && charsTyped[fieldName] > maxLength;
    let selectedValue = widgetData[0].value
      ? widgetData[0].value
      : widgetData[0].defaultValue;

    return (
      <WidgetRenderer
        {...this.props}
        {...{
          readonly,
          isMultiselect,
          widgetField,
          widgetProperties,
          selectedValue,
          showErrorBorder,
          isFocused,
          charsTyped,
        }}
        ref={this.setRef}
        onFocus={this.focus}
        onBlur={this.handleBlurWithParams}
        onPatch={this.handlePatch}
      />
    );
  };

  render() {
    const {
      caption,
      description,
      captionElement,
      fields,
      type,
      noLabel,
      // TODO: We should not be using an empty object when widgetData is not defined.
      // It's really a bad practice. No value = null ! Right now sometimes it's an
      // array with a single empty object, sometimes [-1], other times [undefined].
      // That's a big NO NO
      widgetData,
      rowId,
      isModal,
      handlePatch,
      widgetType,
      handleZoomInto,
      dataEntry,
      subentity,
      fieldFormGroupClass,
      fieldLabelClass,
      fieldInputClass,
    } = this.props;

    const {
      errorPopup,
      clearedFieldWarning,
      tooltipToggled,
      isFocused,
    } = this.state;
    const widgetBody = this.renderWidget();
    const { validStatus, warning } = widgetData[0];
    const quickInput = subentity === 'quickInput';

    // We have to hardcode that exception in case of having
    // wrong two line rendered one line widgets
    const oneLineException =
      ['Switch', 'YesNo', 'Label', 'Button'].indexOf(widgetType) > -1;

    // Unsupported widget type
    if (!widgetBody) {
      // eslint-disable-next-line no-console
      console.warn(
        'The %c' + widgetType,
        'font-weight:bold;',
        'is unsupported type of widget.'
      );

      return false;
    }

    // No display value or not displayed
    if (!widgetData[0].displayed || widgetData[0].displayed !== true) {
      return false;
    }
    const valueDescription =
      widgetData[0].value && widgetData[0].value.description
        ? widgetData[0].value.description
        : null;

    const widgetFieldsName = fields
      .map((field) => 'form-field-' + field.field)
      .join(' ');

    let labelClass;
    let fieldClass;
    let formGroupClass = '';

    if (quickInput) {
      labelClass = fieldLabelClass;
      fieldClass = fieldInputClass;
      formGroupClass = fieldFormGroupClass;
    } else {
      labelClass = dataEntry ? 'col-sm-5' : '';
      if (!labelClass) {
        labelClass =
          type === 'primary' && !oneLineException
            ? 'col-sm-12 panel-title'
            : type === 'primaryLongLabels'
            ? 'col-sm-6'
            : 'col-sm-3';
      }

      fieldClass = dataEntry ? 'col-sm-7' : '';
      if (!fieldClass) {
        fieldClass =
          ((type === 'primary' || noLabel) && !oneLineException
            ? 'col-sm-12 '
            : type === 'primaryLongLabels'
            ? 'col-sm-6'
            : 'col-sm-9 ') + (fields[0].devices ? 'form-group-flex' : '');
      }
    }

    const labelProps = {};

    if (!noLabel && caption && fields[0].supportZoomInto) {
      labelProps.onClick = () => handleZoomInto(fields[0].field);
    }

    return (
      <div
        className={classnames(
          'form-group',
          formGroupClass,
          {
            'form-group-table': rowId && !isModal,
          },
          widgetFieldsName
        )}
      >
        <div className="row">
          {captionElement || null}
          {!noLabel && caption && (
            <label
              className={classnames('form-control-label', labelClass, {
                'input-zoom': quickInput && fields[0].supportZoomInto,
                'zoom-into': fields[0].supportZoomInto,
              })}
              title={description || caption}
              {...labelProps}
            >
              {caption}
            </label>
          )}
          <div
            className={fieldClass}
            onMouseEnter={
              validStatus && !validStatus.valid
                ? this.showErrorPopup
                : undefined
            }
            onMouseLeave={this.hideErrorPopup}
          >
            {!clearedFieldWarning && warning && (
              <div
                className={classnames('field-warning', {
                  'field-warning-message': warning,
                  'field-error-message': warning && warning.error,
                })}
                onMouseEnter={() => this.toggleTooltip(true)}
                onMouseLeave={() => this.toggleTooltip(false)}
              >
                <span>{warning.caption}</span>
                <i
                  className="meta-icon-close-alt"
                  onClick={() => this.clearFieldWarning(warning)}
                />
                {warning.message && tooltipToggled && (
                  <Tooltips action={warning.message} type="" />
                )}
              </div>
            )}

            <div
              className={classnames('input-body-container', {
                focused: isFocused,
              })}
              title={valueDescription}
            >
              <ReactCSSTransitionGroup
                transitionName="fade"
                transitionEnterTimeout={200}
                transitionLeaveTimeout={200}
              >
                {errorPopup &&
                  validStatus &&
                  !validStatus.valid &&
                  !validStatus.initialValue &&
                  this.renderErrorPopup(validStatus.reason)}
              </ReactCSSTransitionGroup>
              {widgetBody}
            </div>
            {fields[0].devices && !widgetData[0].readonly && (
              <DevicesWidget
                devices={fields[0].devices}
                tabIndex={1}
                handleChange={(value) =>
                  handlePatch && handlePatch(fields[0].field, value)
                }
              />
            )}
          </div>
        </div>
      </div>
    );
  }
}

RawWidget.propTypes = RawWidgetPropTypes;
RawWidget.defaultProps = RawWidgetDefaultProps;

export default RawWidget;
