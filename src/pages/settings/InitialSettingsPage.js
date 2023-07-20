import lodashGet from 'lodash/get';
import React from 'react';
import {ScrollView, View} from 'react-native';
import PropTypes from 'prop-types';
import _ from 'underscore';
import {withOnyx} from 'react-native-onyx';
import CurrentUserPersonalDetailsSkeletonView from '../../components/CurrentUserPersonalDetailsSkeletonView';
import {withNetwork} from '../../components/OnyxProvider';
import styles from '../../styles/styles';
import Text from '../../components/Text';
import * as Session from '../../libs/actions/Session';
import ONYXKEYS from '../../ONYXKEYS';
import Tooltip from '../../components/Tooltip';
import Avatar from '../../components/Avatar';
import HeaderWithBackButton from '../../components/HeaderWithBackButton';
import Navigation from '../../libs/Navigation/Navigation';
import * as Expensicons from '../../components/Icon/Expensicons';
import ScreenWrapper from '../../components/ScreenWrapper';
import MenuItem from '../../components/MenuItem';
import ROUTES from '../../ROUTES';
import withLocalize, {withLocalizePropTypes} from '../../components/withLocalize';
import compose from '../../libs/compose';
import CONST from '../../CONST';
import Permissions from '../../libs/Permissions';
import withCurrentUserPersonalDetails, {withCurrentUserPersonalDetailsDefaultProps, withCurrentUserPersonalDetailsPropTypes} from '../../components/withCurrentUserPersonalDetails';
import * as PaymentMethods from '../../libs/actions/PaymentMethods';
import bankAccountPropTypes from '../../components/bankAccountPropTypes';
import cardPropTypes from '../../components/cardPropTypes';
import * as Wallet from '../../libs/actions/Wallet';
import walletTermsPropTypes from '../EnablePayments/walletTermsPropTypes';
import * as PolicyUtils from '../../libs/PolicyUtils';
import ConfirmModal from '../../components/ConfirmModal';
import * as ReportUtils from '../../libs/ReportUtils';
import * as Link from '../../libs/actions/Link';
import OfflineWithFeedback from '../../components/OfflineWithFeedback';
import * as ReimbursementAccountProps from '../ReimbursementAccount/reimbursementAccountPropTypes';
import * as UserUtils from '../../libs/UserUtils';
import policyMemberPropType from '../policyMemberPropType';
import * as ReportActionContextMenu from '../home/report/ContextMenu/ReportActionContextMenu';
import {CONTEXT_MENU_TYPES} from '../home/report/ContextMenu/ContextMenuActions';
import * as CurrencyUtils from '../../libs/CurrencyUtils';
import PressableWithoutFeedback from '../../components/Pressable/PressableWithoutFeedback';

const propTypes = {
    /* Onyx Props */

    /** The session of the logged in person */
    session: PropTypes.shape({
        /** Email of the logged in person */
        email: PropTypes.string,
    }),

    /** The list of this user's policies */
    policies: PropTypes.objectOf(
        PropTypes.shape({
            /** The ID of the policy */
            ID: PropTypes.string,

            /** The name of the policy */
            name: PropTypes.string,

            /** The type of the policy */
            type: PropTypes.string,

            /** The user's role in the policy */
            role: PropTypes.string,

            /** The current action that is waiting to happen on the policy */
            pendingAction: PropTypes.oneOf(_.values(CONST.RED_BRICK_ROAD_PENDING_ACTION)),
        }),
    ),

    /** The user's wallet account */
    userWallet: PropTypes.shape({
        /** The user's current wallet balance */
        currentBalance: PropTypes.number,
    }),

    /** List of bank accounts */
    bankAccountList: PropTypes.objectOf(bankAccountPropTypes),

    /** List of cards */
    cardList: PropTypes.objectOf(cardPropTypes),


    /** List of cards */
    fundList: PropTypes.objectOf(cardPropTypes),

    /** Bank account attached to free plan */
    reimbursementAccount: ReimbursementAccountProps.reimbursementAccountPropTypes,

    /** List of betas available to current user */
    betas: PropTypes.arrayOf(PropTypes.string),

    /** Information about the user accepting the terms for payments */
    walletTerms: walletTermsPropTypes,

    /** Login list for the user that is signed in */
    loginList: PropTypes.shape({
        /** Date login was validated, used to show brickroad info status */
        validatedDate: PropTypes.string,

        /** Field-specific server side errors keyed by microtime */
        errorFields: PropTypes.objectOf(PropTypes.objectOf(PropTypes.string)),
    }),

    /** Members keyed by accountID for all policies */
    allPolicyMembers: PropTypes.objectOf(PropTypes.objectOf(policyMemberPropType)),

    ...withLocalizePropTypes,
    ...withCurrentUserPersonalDetailsPropTypes,
};

const defaultProps = {
    session: {},
    policies: {},
    userWallet: {
        currentBalance: 0,
    },
    reimbursementAccount: {},
    betas: [],
    walletTerms: {},
    bankAccountList: {},
    cardList: {},
    fundList: {},
    loginList: {},
    allPolicyMembers: {},
    ...withCurrentUserPersonalDetailsDefaultProps,
};

class InitialSettingsPage extends React.Component {
    constructor(props) {
        super(props);

        this.popoverAnchor = React.createRef();

        this.getWalletBalance = this.getWalletBalance.bind(this);
        this.getDefaultMenuItems = this.getDefaultMenuItems.bind(this);
        this.getMenuItem = this.getMenuItem.bind(this);
        this.toggleSignoutConfirmModal = this.toggleSignoutConfirmModal.bind(this);
        this.signout = this.signOut.bind(this);

        this.state = {
            shouldShowSignoutConfirmModal: false,
        };
    }

    componentDidMount() {
        Wallet.openInitialSettingsPage();
    }

    /**
     * @param {Boolean} isPaymentItem whether the item being rendered is the payments menu item
     * @returns {Number} the user wallet balance
     */
    getWalletBalance(isPaymentItem) {
        return isPaymentItem && Permissions.canUseWallet(this.props.betas) ? CurrencyUtils.convertToDisplayString(this.props.userWallet.currentBalance) : undefined;
    }

    /**
     * Retuns a list of default menu items
     * @returns {Array} the default menu items
     */
    getDefaultMenuItems() {
        const policiesAvatars = _.chain(this.props.policies)
            .filter((policy) => PolicyUtils.shouldShowPolicy(policy, this.props.network.isOffline))
            .sortBy((policy) => policy.name.toLowerCase())
            .map((policy) => ({
                source: policy.avatar || ReportUtils.getDefaultWorkspaceAvatar(policy.name),
                name: policy.name,
                type: CONST.ICON_TYPE_WORKSPACE,
            }))
            .value();

        const policyBrickRoadIndicator =
            !_.isEmpty(this.props.reimbursementAccount.errors) ||
            _.chain(this.props.policies)
                .filter((policy) => policy && policy.type === CONST.POLICY.TYPE.FREE && policy.role === CONST.POLICY.ROLE.ADMIN)
                .some((policy) => PolicyUtils.hasPolicyError(policy) || PolicyUtils.getPolicyBrickRoadIndicatorStatus(policy, this.props.allPolicyMembers))
                .value()
                ? CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR
                : null;
        const profileBrickRoadIndicator = UserUtils.getLoginListBrickRoadIndicator(this.props.loginList);

        const paymentCardList = this.props.fundList || this.props.cardList;

        return [
            {
                translationKey: 'common.shareCode',
                icon: Expensicons.QrCode,
                action: () => {
                    Navigation.navigate(ROUTES.SETTINGS_SHARE_CODE);
                },
            },
            {
                translationKey: 'common.workspaces',
                icon: Expensicons.Building,
                action: () => {
                    Navigation.navigate(ROUTES.SETTINGS_WORKSPACES);
                },
                floatRightAvatars: policiesAvatars,
                shouldStackHorizontally: true,
                avatarSize: CONST.AVATAR_SIZE.SMALLER,
                brickRoadIndicator: policyBrickRoadIndicator,
            },
            {
                translationKey: 'common.profile',
                icon: Expensicons.Profile,
                action: () => {
                    Navigation.navigate(ROUTES.SETTINGS_PROFILE);
                },
                brickRoadIndicator: profileBrickRoadIndicator,
            },
            {
                translationKey: 'common.preferences',
                icon: Expensicons.Gear,
                action: () => {
                    Navigation.navigate(ROUTES.SETTINGS_PREFERENCES);
                },
            },
            {
                translationKey: 'initialSettingsPage.security',
                icon: Expensicons.Lock,
                action: () => {
                    Navigation.navigate(ROUTES.SETTINGS_SECURITY);
                },
            },
            {
                translationKey: 'common.payments',
                icon: Expensicons.Wallet,
                action: () => {
                    Navigation.navigate(ROUTES.SETTINGS_PAYMENTS);
                },
                brickRoadIndicator:
                    PaymentMethods.hasPaymentMethodError(this.props.bankAccountList, paymentCardList) ||
                    !_.isEmpty(this.props.userWallet.errors) ||
                    !_.isEmpty(this.props.walletTerms.errors)
                        ? 'error'
                        : null,
            },
            {
                translationKey: 'initialSettingsPage.help',
                icon: Expensicons.QuestionMark,
                action: () => {
                    Link.openExternalLink(CONST.NEWHELP_URL);
                },
                shouldShowRightIcon: true,
                iconRight: Expensicons.NewWindow,
                link: CONST.NEWHELP_URL,
            },
            {
                translationKey: 'initialSettingsPage.about',
                icon: Expensicons.Info,
                action: () => {
                    Navigation.navigate(ROUTES.SETTINGS_ABOUT);
                },
            },
            {
                translationKey: 'initialSettingsPage.signOut',
                icon: Expensicons.Exit,
                action: () => {
                    this.signout(false);
                },
            },
        ];
    }

    getMenuItem(item, index) {
        const keyTitle = item.translationKey ? this.props.translate(item.translationKey) : item.title;
        const isPaymentItem = item.translationKey === 'common.payments';

        return (
            <MenuItem
                key={`${keyTitle}_${index}`}
                title={keyTitle}
                icon={item.icon}
                iconType={item.iconType}
                onPress={item.action}
                iconStyles={item.iconStyles}
                shouldShowRightIcon
                iconRight={item.iconRight}
                badgeText={this.getWalletBalance(isPaymentItem)}
                fallbackIcon={item.fallbackIcon}
                brickRoadIndicator={item.brickRoadIndicator}
                floatRightAvatars={item.floatRightAvatars}
                shouldStackHorizontally={item.shouldStackHorizontally}
                floatRightAvatarSize={item.avatarSize}
                ref={this.popoverAnchor}
                shouldBlockSelection={Boolean(item.link)}
                onSecondaryInteraction={!_.isEmpty(item.link) ? (e) => ReportActionContextMenu.showContextMenu(CONTEXT_MENU_TYPES.LINK, e, item.link, this.popoverAnchor.current) : undefined}
            />
        );
    }

    toggleSignoutConfirmModal(value) {
        this.setState({shouldShowSignoutConfirmModal: value});
    }

    signOut(shouldForceSignout = false) {
        if (!this.props.network.isOffline || shouldForceSignout) {
            Session.signOutAndRedirectToSignIn();
            return;
        }

        // When offline, warn the user that any actions they took while offline will be lost if they sign out
        this.toggleSignoutConfirmModal(true);
    }

    openProfileSettings() {
        Navigation.navigate(ROUTES.SETTINGS_PROFILE);
    }

    render() {
        return (
            <ScreenWrapper includeSafeAreaPaddingBottom={false}>
                {({safeAreaPaddingBottomStyle}) => (
                    <>
                        <HeaderWithBackButton title={this.props.translate('common.settings')} />
                        <ScrollView
                            contentContainerStyle={safeAreaPaddingBottomStyle}
                            style={[styles.settingsPageBackground]}
                        >
                            <View style={styles.w100}>
                                {_.isEmpty(this.props.currentUserPersonalDetails) || _.isUndefined(this.props.currentUserPersonalDetails.displayName) ? (
                                    <CurrentUserPersonalDetailsSkeletonView />
                                ) : (
                                    <View style={styles.avatarSectionWrapper}>
                                        <Tooltip text={this.props.translate('common.profile')}>
                                            <PressableWithoutFeedback
                                                style={[styles.mb3]}
                                                onPress={this.openProfileSettings}
                                                accessibilityLabel={this.props.translate('common.profile')}
                                                accessibilityRole={CONST.ACCESSIBILITY_ROLE.BUTTON}
                                            >
                                                <OfflineWithFeedback pendingAction={lodashGet(this.props.currentUserPersonalDetails, 'pendingFields.avatar', null)}>
                                                    <Avatar
                                                        imageStyles={[styles.avatarLarge]}
                                                        source={UserUtils.getAvatar(this.props.currentUserPersonalDetails.avatar, this.props.session.accountID)}
                                                        size={CONST.AVATAR_SIZE.LARGE}
                                                    />
                                                </OfflineWithFeedback>
                                            </PressableWithoutFeedback>
                                        </Tooltip>
                                        <PressableWithoutFeedback
                                            style={[styles.mt1, styles.mw100]}
                                            onPress={this.openProfileSettings}
                                            accessibilityLabel={this.props.translate('common.profile')}
                                            accessibilityRole={CONST.ACCESSIBILITY_ROLE.LINK}
                                        >
                                            <Tooltip text={this.props.translate('common.profile')}>
                                                <Text
                                                    style={[styles.textHeadline, styles.pre]}
                                                    numberOfLines={1}
                                                >
                                                    {this.props.currentUserPersonalDetails.displayName
                                                        ? this.props.currentUserPersonalDetails.displayName
                                                        : this.props.formatPhoneNumber(this.props.session.email)}
                                                </Text>
                                            </Tooltip>
                                        </PressableWithoutFeedback>
                                        {Boolean(this.props.currentUserPersonalDetails.displayName) && (
                                            <Text
                                                style={[styles.textLabelSupporting, styles.mt1]}
                                                numberOfLines={1}
                                            >
                                                {this.props.formatPhoneNumber(this.props.session.email)}
                                            </Text>
                                        )}
                                    </View>
                                )}
                                {_.map(this.getDefaultMenuItems(), (item, index) => this.getMenuItem(item, index))}

                                <ConfirmModal
                                    danger
                                    title={this.props.translate('common.areYouSure')}
                                    prompt={this.props.translate('initialSettingsPage.signOutConfirmationText')}
                                    confirmText={this.props.translate('initialSettingsPage.signOut')}
                                    cancelText={this.props.translate('common.cancel')}
                                    isVisible={this.state.shouldShowSignoutConfirmModal}
                                    onConfirm={() => this.signOut(true)}
                                    onCancel={() => this.toggleSignoutConfirmModal(false)}
                                />
                            </View>
                        </ScrollView>
                    </>
                )}
            </ScreenWrapper>
        );
    }
}

InitialSettingsPage.propTypes = propTypes;
InitialSettingsPage.defaultProps = defaultProps;

export default compose(
    withLocalize,
    withCurrentUserPersonalDetails,
    withOnyx({
        session: {
            key: ONYXKEYS.SESSION,
        },
        policies: {
            key: ONYXKEYS.COLLECTION.POLICY,
        },
        allPolicyMembers: {
            key: ONYXKEYS.COLLECTION.POLICY_MEMBERS,
        },
        userWallet: {
            key: ONYXKEYS.USER_WALLET,
        },
        betas: {
            key: ONYXKEYS.BETAS,
        },
        bankAccountList: {
            key: ONYXKEYS.BANK_ACCOUNT_LIST,
        },
        reimbursementAccount: {
            key: ONYXKEYS.REIMBURSEMENT_ACCOUNT,
        },
        cardList: {
            key: ONYXKEYS.CARD_LIST,
        },
        fundList: {
            key: ONYXKEYS.FUND_LIST,
        },
        walletTerms: {
            key: ONYXKEYS.WALLET_TERMS,
        },
        loginList: {
            key: ONYXKEYS.LOGIN_LIST,
        },
    }),
    withNetwork(),
)(InitialSettingsPage);
