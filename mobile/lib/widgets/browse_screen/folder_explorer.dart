import 'dart:io';

import 'package:coursehub/apis/files/get_link.dart';
import 'package:coursehub/apis/user/user.dart';
import 'package:coursehub/constants/themes.dart';
import 'package:coursehub/controllers/downloader.dart';
import 'package:coursehub/database/hive_store.dart';
import 'package:coursehub/models/favourites.dart';
import 'package:coursehub/widgets/common/custom_linear_progress.dart';
import 'package:coursehub/widgets/common/custom_snackbar.dart';
import 'package:flutter/material.dart';

import 'package:flutter_svg/flutter_svg.dart';
import 'package:open_filex/open_filex.dart';

import 'package:path_provider/path_provider.dart';

import '../../controllers/url_launcher.dart';

class FolderExplorer extends StatefulWidget {
  final Map<dynamic, dynamic> data;
  final Function(String) callback;

  const FolderExplorer({super.key, required this.data, required this.callback});

  @override
  State<FolderExplorer> createState() => _FolderExplorerState();
}

class _FolderExplorerState extends State<FolderExplorer> {
  bool _isLoading = false;
  bool _isDownloading = false;

  @override
  Widget build(BuildContext context) {
    if (widget.data["childType"] == "Folder") {
      List<Widget> folders = [];
      for (var e in widget.data["children"]) {
        folders.add(
          Ink(
            child: InkWell(
              onTap: () => widget.callback(e["name"]),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Stack(
                  children: [
                    SvgPicture.asset(
                      "assets/folder_card.svg",
                      width: double.infinity,
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16.0, 20.0, 0, 0),
                      child: Text(
                        e["name"],
                        style: const TextStyle(
                          fontFamily: "ProximaNova",
                          fontSize: 18.0,
                          fontWeight: FontWeight.w700,
                          color: Colors.black,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      }
      return Padding(
        padding: const EdgeInsets.all(8.0),
        child: GridView.count(
          crossAxisCount: 2,
          crossAxisSpacing: 0.0,
          mainAxisSpacing: 0.0,
          childAspectRatio: 1.25,
          shrinkWrap: true,
          children: folders,
        ),
      );
    } else {
      String path = widget.data["path"];
      String code = widget.data["course"];
      return Stack(
        children: [
          ListView.builder(
            itemCount: widget.data["children"].length,
            itemBuilder: (context, index) {
              String name = widget.data["children"][index]["name"];

              bool isFavourite = HiveStore.getUserDetails().favourites.any(
                    (element) => element.name == name,
                  );

              return FutureBuilder(
                  future: isFileDownloaded(name),
                  builder: (context, snapshot) {
                    if (snapshot.hasData) {
                      bool isDownloaded = snapshot.data ?? false;
                      return Material(
                        child: InkWell(
                          onTap: () async {
                            if (isDownloaded) {
                              try {
                                final tempDirectory =
                                    await getApplicationDocumentsDirectory();
                                OpenFilex.open('${tempDirectory.path}/$name');
                              } catch (e) {
                                showSnackBar('Somwthing went wrong!', context);
                              }
                            } else {
                              try {
                                setState(() {
                                  _isLoading = true;
                                });
                                final link = await getPreviewLink(
                                    widget.data["children"][index]["id"]);

                                setState(() {
                                  _isLoading = false;
                                });
                                await launchUrl(link);
                              } catch (e) {
                                setState(() {
                                  _isLoading = false;
                                });
                                showSnackBar('Something Went Wrong!', context);
                              }
                            }
                          },
                          splashColor: Themes.kYellow,
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 16.0),
                            decoration: const BoxDecoration(
                                border: Border(bottom: BorderSide())),
                            child: Row(
                              children: [
                                const SizedBox(
                                  width: 12.0,
                                ),
                                SizedBox(
                                  width: 30.0,
                                  height: 40.0,
                                  child: CircleAvatar(
                                    backgroundColor: const Color.fromRGBO(
                                        254, 207, 111, 0.5),
                                    child: Image.network(
                                      widget.data["children"][index]
                                          ["thumbnail"],
                                      errorBuilder:
                                          (context, error, stackTrace) {
                                        return const Icon(
                                          Icons.filter_b_and_w_sharp,
                                          color: Color.fromRGBO(0, 0, 0, 0.75),
                                        );
                                      },
                                    ),
                                  ),
                                ),
                                const SizedBox(
                                  width: 12.0,
                                ),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        name,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w500,
                                          fontSize: 18.0,
                                          color: Colors.black,
                                        ),
                                      ),
                                      const Text(
                                        "by Atharva Tagalpallewar",
                                        style: TextStyle(
                                          fontFamily: "ProximaNova",
                                          fontWeight: FontWeight.w400,
                                          fontSize: 14.0,
                                          color: Color(0xFF585858),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(
                                  width: 20,
                                ),
                                GestureDetector(
                                  onTap: () async {
                                    if (isDownloaded) {
                                      showSnackBar(
                                          'File Already Downloaded!', context);
                                      return;
                                    }
                                    if (_isDownloading) {
                                      showSnackBar(
                                          'Wait for the current download to get finished!',
                                          context);
                                      return;
                                    }
                                    try {
                                      setState(() {
                                        _isLoading = true;
                                      });
                                      final link = await getDownloadLink(
                                          widget.data["children"][index]["id"]);

                                      setState(() {
                                        _isLoading = false;
                                      });

                                      setState(() {
                                        _isDownloading = true;
                                      });
                                      final fileName = widget.data["children"]
                                          [index]["name"];

                                      final filedata = await downloader(
                                        link,
                                      );

                                      final tempDirectory =
                                          await getApplicationDocumentsDirectory();
                                      File file = File(
                                          '${tempDirectory.path}/$fileName');
                                      final raf =
                                          file.openSync(mode: FileMode.write);
                                      raf.writeFromSync(filedata);
                                      await raf.close();

                                      await OpenFilex.open(file.path);
                                      setState(() {
                                        _isDownloading = false;
                                      });
                                    } catch (e) {
                                      showSnackBar(
                                          'Something Went Wrong!', context);
                                    }
                                  },
                                  child: isDownloaded
                                      ? const Icon(
                                          Icons.check_circle,
                                          color: Colors.green,
                                        )
                                      : const Icon(
                                          Icons.download_for_offline_outlined,
                                          size: 30.0,
                                          color: Color.fromRGBO(0, 0, 0, 0.75),
                                        ),
                                ),
                                const SizedBox(
                                  width: 10,
                                ),
                                GestureDetector(
                                  onTap: () async {
                                    if (!isFavourite) {
                                      try {
                                        await addFavourites(
                                          name,
                                          widget.data["children"][index]["id"],
                                          path,
                                          code,
                                        );

                                        setState(() {});
                                        return;
                                      } catch (e) {
                                        showSnackBar(
                                            'Something went wrong!', context);
                                        return;
                                      }
                                    } else {
                                      try {
                                        Favourite fav = HiveStore.getUserDetails()
                                            .favourites
                                            .firstWhere(
                                              (element) => element.name == name,
                                            );
                                      
                         
                                        await removeFavourites(
                                          fav.id,
                                        );

                                        setState(() {});
                                        return;
                                      } catch (e) {
                                        showSnackBar(
                                            'Something went wrong!', context);
                                        return;
                                      }
                                    }
                                  },
                                  child: !isFavourite
                                      ? const Icon(
                                          Icons.star_border_outlined,
                                          color: Color.fromRGBO(0, 0, 0, 0.75),
                                          size: 30,
                                        )
                                      : const Icon(
                                          Icons.star_purple500_sharp,
                                          color: Themes.kYellow,
                                          size: 30,
                                        ),
                                ),
                                const SizedBox(
                                  width: 15.0,
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    } else {
                      return Container();
                    }
                  });
            },
          ),
          Visibility(
            visible: _isLoading,
            child: const CustomLinearProgress(text: 'Loading ...'),
          ),
          Visibility(
            visible: _isDownloading,
            child: Container(
              width: double.infinity,
              height: double.infinity,
              color: const Color.fromRGBO(255, 255, 255, 0.9),
            ),
          )
        ],
      );
    }
  }
}
