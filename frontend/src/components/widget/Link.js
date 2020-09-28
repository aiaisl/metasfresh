import React, { Component } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

class Link extends Component {
  handleClick = () => {
    const { widgetData } = this.props;
    const url = widgetData[0].value;

    window.open(url, '_blank');
  };

  render() {
    const {
      getClassNames,
      isFocused,
      widgetProperties,
      icon,
      widgetData,
    } = this.props;
    return (
      <div className="input-inner-container">
        <div className={cx(getClassNames(), { 'input-focused': isFocused })}>
          <input {...widgetProperties} type="text" />
          {icon && <i className="meta-icon-edit input-icon-right" />}
        </div>
        <div
          onClick={this.handleClick}
          className={cx(
            'btn btn-icon btn-meta-outline-secondary btn-inline',
            'pointer btn-distance-rev btn-sm',
            {
              'btn-disabled btn-meta-disabled':
                !widgetData[0].validStatus.valid || widgetData[0].value === '',
            }
          )}
        >
          <i className="meta-icon-link" />
        </div>
      </div>
    );
  }
}

Link.propTypes = {
  getClassNames: PropTypes.func,
  isFocused: PropTypes.bool,
  widgetProperties: PropTypes.any,
  icon: PropTypes.any,
  widgetData: PropTypes.any,
};

export default Link;
