import '../../apis/files/downloader.dart';
import '../../models/favourites.dart';
import '../../utilities/letter_capitalizer.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:share_plus/share_plus.dart';

import '../../utilities/dynamic_links.dart';
import '../../widgets/common/custom_snackbar.dart';

class FavouriteTile extends StatelessWidget {
  final Favourite favourite;
  final Function setLoadingCallback;
  const FavouriteTile({
    super.key,
    required this.favourite,
    required this.setLoadingCallback,
  });

  @override
  Widget build(BuildContext context) {
    String path = '';

    for (var i = 0; i < favourite.path.length; i++) {
      if (favourite.path[i] == '-') break;
      path += favourite.path[i];
    }

    List<String> paths = favourite.path.split('/');

    for (var i = 1; i < paths.length; i++) {
      path += ' > ';
      path += paths[i];
    }

    return GestureDetector(
      onTap: () async {
        bool isDownloaded = await isFileDownloaded(favourite.name);
        if (!context.mounted) return;
        await downloadOpenFiles(
            isDownloaded, favourite.name, favourite.favouriteId, context);
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: ListTile(
            leading: SvgPicture.asset('assets/favourite_file.svg'),
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  path,
                  maxLines: 2,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: Color.fromRGBO(37, 37, 37, 1),
                  ),
                ),
                const SizedBox(
                  height: 5,
                ),
                Text(
                  letterCapitalizer(favourite.name.split('.')[0]),
                  style: const TextStyle(
                      fontWeight: FontWeight.w400, fontSize: 14),
                ),
              ],
            ),
            trailing: PopupMenuButton(
              icon: const Icon(Icons.more_vert_rounded),
              itemBuilder: (context) {
                return [
                  PopupMenuItem(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    child: GestureDetector(
                      onTap: () async {
                        try {
                          String address = favourite.path;
                          final shareLink =
                              await FirebaseDynamicLink.createDynamicLink(
                            favourite.name.toLowerCase(),
                            favourite.id,
                            address,
                          );

                          await Share.share(shareLink,
                              subject: '$favourite.name \n CourseHub');
                        } catch (e) {
                          if (!context.mounted) return;
                          showSnackBar('Something went Wrong!', context);
                        }
                      },
                      child: const Row(
                        children: [
                          Icon(Icons.share),
                          SizedBox(
                            width: 5,
                          ),
                          Text('Share')
                        ],
                      ),
                    ),
                  ),
                ];
              },
            )),
      ),
    );
  }
}
