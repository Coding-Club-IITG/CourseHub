import 'package:coursehub/utilities/helpers/helpers.dart';

import '../../apis/files/downloader.dart';
import '../../models/favourites.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:share_plus/share_plus.dart';

import '../../utilities/dynamic_links.dart';
import '../../widgets/common/custom_snackbar.dart';

class FavouriteTile extends StatefulWidget {
  final Favourite favourite;
  final Function setLoadingCallback;
  const FavouriteTile({
    super.key,
    required this.favourite,
    required this.setLoadingCallback,
  });

  @override
  State<FavouriteTile> createState() => _FavouriteTileState();
}

class _FavouriteTileState extends State<FavouriteTile> {
  @override
  Widget build(BuildContext context) {
    String path = '';

    for (var i = 0; i < widget.favourite.path.length; i++) {
      if (widget.favourite.path[i] == '-') break;
      path += widget.favourite.path[i];
    }

    List<String> paths = widget.favourite.path.split('/');

    for (var i = 1; i < paths.length; i++) {
      path += ' > ';
      path += paths[i];
    }

    return FutureBuilder(
      future: isFileDownloaded(widget.favourite.name),
      builder: (BuildContext context, AsyncSnapshot<bool> snapshot)
      {
        bool isDownloaded = snapshot.data ?? false;
        return Material(
          color: Colors.white,
            child: InkWell(
              splashColor: Colors.grey,
              onTap: () async {
                if (!context.mounted) return;
                await downloadOpenFiles(
                    isDownloaded, widget.favourite.name, widget.favourite.favouriteId, context);
                if (!isDownloaded) {
                  setState(() {
                    isDownloaded = true;
                  });
                }
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
                          letterCapitalizer(widget.favourite.name.split('.')[0]),
                          style: const TextStyle(
                              fontWeight: FontWeight.w400, fontSize: 14),
                        ),
                      ],
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Visibility(
                          visible: isDownloaded,
                          child: Container(
                            transform:
                            Matrix4.translationValues(
                                0, 2, 0),
                            child: const Icon(
                              Icons.check_circle_rounded,
                              color: Colors.green,
                            ),
                          ),
                        ),
                        PopupMenuButton(
                          icon: const Icon(Icons.more_vert_rounded),
                          itemBuilder: (context) {
                            return [
                              PopupMenuItem(
                                padding: const EdgeInsets.symmetric(horizontal: 10),
                                child: GestureDetector(
                                  onTap: () async {
                                    try {
                                      String address = widget.favourite.path;
                                      final shareLink =
                                      await FirebaseDynamicLink.createDynamicLink(
                                        widget.favourite.name.toLowerCase(),
                                        widget.favourite.id,
                                        address,
                                      );

                                      await Share.share(shareLink,
                                          subject: '$widget.favourite.name \n CourseHub');
                                    } catch (e) {
                                      if(!mounted)return;
                                      showSnackBar('Something went Wrong!', context);
                                    }
                                  },
                                  child:const  Row(
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
                        ),
                      ],
                    )),
              ),
            )
        );
      },

    );
  }
}
