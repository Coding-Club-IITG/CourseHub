import 'package:flutter/material.dart';
import 'package:flutter_custom_tabs/flutter_custom_tabs.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../apis/files/get_link.dart';
import '../../constants/themes.dart';
import '../../widgets/common/custom_snackbar.dart';

class FavouriteCard extends StatelessWidget {
  final String index;
  final String address;
  final String name;
  final String id;
  final Function callback;
  const FavouriteCard({
    super.key,
    required this.index,
    required this.address,
    required this.name,
    required this.id,
    required this.callback,
  });

  Future<void> _launchUrl(String url) async {
    callback();
    await launch(url,
        customTabsOption: CustomTabsOption(
          animation: CustomTabsSystemAnimation.fade(),
          toolbarColor: Colors.black,
          showPageTitle: true,
          enableDefaultShare: false,
        ),
        safariVCOption: const SafariViewControllerOption(
            preferredBarTintColor: Colors.black,
            preferredControlTintColor: Colors.white));
    callback();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () async {
        try {
          callback();
          final link = await getPreviewLink(id);
          await _launchUrl(link);
          callback();
        } catch (e) {
          showSnackBar('Something Went Wrong!', context);
        }
      },
      // color: Colors.black,

      child: Stack(
        children: [
          SvgPicture.asset(
            'assets/favourites_card.svg',
            alignment: Alignment.center,
            height: 150,
          ),
          Positioned(
            top: 10,
            left: 12,
            child: SizedBox(
              width: 120,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(address, style: Themes.darkTextTheme.bodySmall),
                  const SizedBox(
                    height: 11.5,
                  ),
                  Text(
                    name,
                    style: const TextStyle(
                        color: Colors.black, height: 1.3, fontSize: 15),
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            bottom: 12,
            right: 12,
            child: Text(
              index,
              textAlign: TextAlign.right,
              style: const TextStyle(
                fontFamily: "ProximaNova",
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: Color.fromRGBO(0, 0, 0, 0.25),
              ),
            ),
          )
        ],
      ),
    );
  }
}
